const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM other_expenses';
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

router.post('/', auth, async (req, res) => {
  try {
    const { title, category, amount, date, notes, module_type, payment_method } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    const result = await pool.query(
      'INSERT INTO other_expenses (title, category, amount, date, notes, user_id, module_type, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, category, amount || 0, date || new Date().toLocaleDateString('en-CA'), notes, req.user.id, finalModule, payment_method || 'Cash']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, category, amount, date, notes, payment_method } = req.body;
    const result = await pool.query(
      'UPDATE other_expenses SET title=$1, category=$2, amount=$3, date=$4, notes=$5, payment_method=$6 WHERE id=$7 AND (module_type=$8 OR $9) RETURNING *',
      [title, category, amount || 0, date, notes, payment_method, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM other_expenses WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
