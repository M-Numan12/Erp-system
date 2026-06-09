const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

// Get all vehicles
router.get('/', auth, async (req, res) => {
  try {
    const { type, ownership_type } = req.query; // ownership_type = 'Personal' or 'Rent'
    let query = 'SELECT * FROM vehicles';
    let params = [];
    let conditions = ['(is_deleted IS NOT TRUE)'];

    if (type) {
      params.push(type);
      conditions.push(`module_type = $${params.length}`);
    }

    if (ownership_type) {
      params.push(ownership_type);
      conditions.push(`ownership_type = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add new vehicle
router.post('/', auth, async (req, res) => {
  try {
    const { 
      ownership_type, vehicle_number, driver_name, 
      driver_cnic, driver_phone, module_type 
    } = req.body;
    
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    const result = await pool.query(
      `INSERT INTO vehicles 
      (ownership_type, vehicle_number, driver_name, driver_cnic, driver_phone, total_earnings, user_id, module_type) 
      VALUES ($1, $2, $3, $4, $5, 0, $6, $7) RETURNING *`,
      [ownership_type, vehicle_number, driver_name, driver_cnic, driver_phone, req.user.id, finalModule]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update vehicle
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      ownership_type, vehicle_number, driver_name, 
      driver_cnic, driver_phone 
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicles SET 
        ownership_type=$1, vehicle_number=$2, driver_name=$3, driver_cnic=$4, driver_phone=$5
      WHERE id=$6 AND (user_id=$7 OR $8) RETURNING *`,
      [
        ownership_type, vehicle_number, driver_name, driver_cnic, driver_phone, 
        req.params.id, req.user.id, isAdmin(req)
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete vehicle
// Get Vehicle Ledger (Combined Sales & Purchases & Payments)
router.get('/ledger/:id', auth, async (req, res) => {
  try {
    const vId = req.params.id;
    
    // 1. Trips from Sales (Outward / Returns)
    const salesTrips = await pool.query(
      `SELECT id, customer_name as party_name, delivery_charges, vehicle_id, vehicle_id2, vehicle_ids, created_at as date, 
              CASE WHEN status = 'Returned' THEN 'Inward (Return)' ELSE 'Outward (Sale)' END as trip_type, 
              payment_type
       FROM sales 
       WHERE vehicle_id = $1 OR vehicle_id2 = $1 OR (vehicle_ids IS NOT NULL AND vehicle_ids @> $2::jsonb)`, 
      [vId, JSON.stringify([parseInt(vId)])]
    );

    const formattedSalesTrips = salesTrips.rows.map(row => {
      let amount = parseFloat(row.delivery_charges || 0);
      if (row.vehicle_ids) {
        let ids = [];
        try {
          ids = typeof row.vehicle_ids === 'string' ? JSON.parse(row.vehicle_ids) : row.vehicle_ids;
        } catch(e){}
        if (Array.isArray(ids) && ids.length > 0) {
          amount = amount / ids.length;
        }
      } else if (row.vehicle_id && row.vehicle_id2) {
        amount = amount / 2.0;
      }
      return {
        id: row.id,
        party_name: row.party_name,
        amount: amount,
        date: row.date,
        trip_type: row.trip_type,
        payment_type: row.payment_type
      };
    });

    // 2. Trips from Purchases (Inward Stock)
    const purchaseTrips = await pool.query(
      `SELECT p.id, s.name as party_name, p.delivery_charges as amount, p.purchase_date as date, 'Inward (Stock)' as trip_type, p.fare_payment_type as payment_type
       FROM purchases p 
       JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.vehicle_id = $1`, [vId]
    );

    // 3. Payments/Expenses made to Vehicle
    const payments = await pool.query(
      `SELECT id, description as party_name, amount, expense_date as date, 
              CASE WHEN category = 'Fare Payment' THEN 'Payment' ELSE 'Expense (Deduction)' END as trip_type, 
              payment_type
       FROM expenses WHERE vehicle_id = $1`, [vId]
    );

    const combined = [...formattedSalesTrips, ...purchaseTrips.rows, ...payments.rows].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(combined);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Record payment to vehicle
router.post('/payment', auth, async (req, res) => {
  try {
    const { vehicle_id, paid_amount, notes, payment_type, module_type } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    // 1. Fetch vehicle info
    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = vehicleRes.rows[0];

    // 2. Insert into expenses table (skip if it is a Deduction)
    if (payment_type !== 'Deduction') {
      await pool.query(
        `INSERT INTO expenses (description, amount, expense_type, category, payment_type, notes, user_id, module_type, vehicle_id, expense_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)`,
        [
          `Payment to Vehicle: ${vehicle.vehicle_number} - ${vehicle.driver_name}`,
          paid_amount,
          'Transport',
          'Fare Payment',
          payment_type,
          notes || 'Payment Sent',
          req.user.id,
          finalModule,
          vehicle_id
        ]
      );
    }

    // 3. Update vehicle total_earnings (subtraction)
    const updateRes = await pool.query(
      `UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2 RETURNING *`,
      [paid_amount, vehicle_id]
    );

    res.json(updateRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('UPDATE vehicles SET is_deleted=TRUE WHERE id=$1 AND (user_id=$2 OR $3)', [req.params.id, req.user.id, isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
