const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT id, description as title, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id, created_at FROM expenses';
    let params = [];

    if (isAdmin(req)) {
      if (type) {
        query += ' WHERE module_type = $1';
        params.push(type);
      }
    } else {
      query += ' WHERE module_type = $1';
      params.push(req.user.module_type || 'Retail 1');
    }

    query += ' ORDER BY expense_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, expense_type, category, amount, expense_date, notes, module_type, payment_type, vehicle_id } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    const result = await pool.query(
      'INSERT INTO expenses (description, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, description as title, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id, created_at',
      [title, expense_type || 'Office', category, amount || 0, expense_date || new Date().toLocaleDateString('en-CA'), notes, req.user.id, finalModule, payment_type || 'Cash', vehicle_id || null]
    );

    if (vehicle_id) {
      await pool.query('UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2', [amount || 0, vehicle_id]);
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, expense_type, category, amount, expense_date, notes, payment_type, vehicle_id } = req.body;

    const orig = await pool.query('SELECT amount, vehicle_id FROM expenses WHERE id=$1', [req.params.id]);
    if (orig.rows.length > 0) {
      const oldAmt = parseFloat(orig.rows[0].amount || 0);
      const oldVehicleId = orig.rows[0].vehicle_id;
      if (oldVehicleId) {
        await pool.query('UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2', [oldAmt, oldVehicleId]);
      }
    }

    const result = await pool.query(
      'UPDATE expenses SET description=$1, expense_type=$2, category=$3, amount=$4, expense_date=$5, notes=$6, payment_type=$7, vehicle_id=$8 WHERE id=$9 AND (module_type=$10 OR $11) RETURNING id, description as title, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id, created_at',
      [title, expense_type, category, amount, expense_date, notes, payment_type, vehicle_id || null, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );

    if (vehicle_id) {
      await pool.query('UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2', [amount || 0, vehicle_id]);
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const orig = await pool.query('SELECT amount, vehicle_id FROM expenses WHERE id=$1', [req.params.id]);
    if (orig.rows.length > 0) {
      const oldAmt = parseFloat(orig.rows[0].amount || 0);
      const oldVehicleId = orig.rows[0].vehicle_id;
      if (oldVehicleId) {
        await pool.query('UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2', [oldAmt, oldVehicleId]);
      }
    }

    await pool.query('DELETE FROM expenses WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
