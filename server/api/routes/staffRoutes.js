const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

// Get all staff
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM staff';
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

    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a staff member
router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, address, opening_balance, module_type } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    
    const startBal = opening_balance || 0;
    const result = await pool.query(
      'INSERT INTO staff (name, phone, address, opening_balance, current_balance, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, phone, address, startBal, startBal, req.user.id, finalModule]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a staff member
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const result = await pool.query(
      'UPDATE staff SET name=$1, phone=$2, address=$3 WHERE id=$4 AND (module_type=$5 OR $6) RETURNING *',
      [name, phone, address, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a staff member
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM staff WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ledger for a specific staff member
router.get('/:id/ledger', auth, async (req, res) => {
  try {
    const staffId = req.params.id;
    let staffRes;
    if (isAdmin(req)) {
      staffRes = await pool.query('SELECT * FROM staff WHERE id = $1', [staffId]);
    } else {
      staffRes = await pool.query(
        'SELECT * FROM staff WHERE id = $1 AND module_type = $2',
        [staffId, req.user.module_type || 'Retail 1']
      );
    }
    if (staffRes.rows.length === 0) return res.status(404).json({ error: 'Staff not found' });
    
    const ledgerRes = await pool.query('SELECT * FROM staff_ledger WHERE staff_id = $1 ORDER BY date ASC, id ASC', [staffId]);
    res.json({
      staff: staffRes.rows[0],
      ledger: ledgerRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add ledger transaction (Advance/Return)
router.post('/:id/ledger', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const staffId = req.params.id;
    const { date, description, type, amount, payment_method } = req.body; // type: 'advance' (give) or 'return' (receive)
    const amt = parseFloat(amount) || 0;
    
    if (amt <= 0) throw new Error('Amount must be positive');
    
    let staffRes;
    if (isAdmin(req)) {
      staffRes = await client.query('SELECT * FROM staff WHERE id = $1 FOR UPDATE', [staffId]);
    } else {
      staffRes = await client.query(
        'SELECT * FROM staff WHERE id = $1 AND module_type = $2 FOR UPDATE',
        [staffId, req.user.module_type || 'Retail 1']
      );
    }
    if (staffRes.rows.length === 0) throw new Error('Staff not found');
    const staff = staffRes.rows[0];

    let debit = 0, credit = 0;
    // In Staff Ledger:
    // Debit = Payments Given to Staff (Advance/Salary paid). This INCREASES the balance owed by staff.
    // Credit = Payments Received from Staff (Return). This DECREASES the balance owed by staff.
    if (type === 'advance') {
      debit = amt;
    } else if (type === 'return') {
      credit = amt;
    } else {
      throw new Error('Invalid transaction type');
    }

    const newBalance = parseFloat(staff.current_balance) + debit - credit;

    // 1. Insert into staff_ledger
    const ledgerRes = await client.query(
      'INSERT INTO staff_ledger (staff_id, date, description, debit, credit, balance, payment_method, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [staffId, date || new Date(), description, debit, credit, newBalance, payment_method, req.user.id, staff.module_type]
    );

    // 2. Update staff balance
    await client.query('UPDATE staff SET current_balance = $1 WHERE id = $2', [newBalance, staffId]);

    // 3. Link with Cash/Bank through expenses table (so bank balances reflect this)
    // If we give an advance (type='advance'), cash leaves the business -> Expense
    // If we get a return (type='return'), cash enters the business -> Transfer In/Income
    const expenseType = type === 'advance' ? 'Staff Advance' : 'Transfer In';
    const expenseCat = 'Staff';
    const expenseDesc = `${type === 'advance' ? 'Advance given to' : 'Return received from'} staff: ${staff.name} - ${description}`;
    
    await client.query(
      `INSERT INTO expenses (description, expense_type, category, amount, payment_type, expense_date, notes, user_id, module_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        expenseDesc,
        expenseType,
        expenseCat,
        amt,
        payment_method || 'Cash',
        date || new Date(),
        `Staff Ledger ID: ${ledgerRes.rows[0].id}`,
        req.user.id,
        staff.module_type
      ]
    );

    await client.query('COMMIT');
    res.json(ledgerRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
