const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

// 1. GET all labours
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM labours';
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

    query += ' ORDER BY group_name ASC, name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. POST create labour
router.post('/', auth, async (req, res) => {
  try {
    const { name, group_name, contact, rate_per_day, cnic, module_type } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const result = await pool.query(
      'INSERT INTO labours (name, group_name, contact, rate_per_day, cnic, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, group_name, contact, rate_per_day || 0, cnic, req.user.id, finalModule]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. PUT update labour
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, group_name, contact, rate_per_day, cnic } = req.body;
    const result = await pool.query(
      'UPDATE labours SET name=$1, group_name=$2, contact=$3, rate_per_day=$4, cnic=$5 WHERE id=$6 AND (module_type=$7 OR $8) RETURNING *',
      [name, group_name, contact, rate_per_day, cnic, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. DELETE labour
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM labours WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Labour deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. GET all work history
router.get('/work-history', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM labour_work_history';
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

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. POST log work entry
router.post('/work-history', auth, async (req, res) => {
  try {
    const { group_name, bill_id, description, amount, module_type } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const result = await pool.query(
      'INSERT INTO labour_work_history (group_name, bill_id, description, amount, status, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [group_name, bill_id, description, amount || 0, 'Unpaid', req.user.id, finalModule]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. POST pay group wages
router.post('/pay', auth, async (req, res) => {
  const { group_name, bill_id, amount, notes, payment_type, module_type } = req.body;
  const finalPaymentType = payment_type || 'Cash';
  const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
  try {
    // Log payment into work history
    await pool.query(
      'INSERT INTO labour_work_history (group_name, bill_id, description, amount, status, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [group_name, bill_id || null, notes || `Paid wages to ${group_name} (Bill #${bill_id || 'N/A'})`, amount, 'Paid', req.user.id, finalModule]
    );

    // Record as an expense to deduct from the selected Cash/Bank account
    await pool.query(
      'INSERT INTO expenses (description, expense_type, category, amount, user_id, module_type, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [`Labour Wage: ${group_name} (Bill #${bill_id || 'N/A'}, Notes: ${notes || 'Wages Paid'})`, 'Office', 'Labour Charges', amount, req.user.id, finalModule, finalPaymentType]
    );

    res.json({ message: 'Wage payment successfully processed!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
