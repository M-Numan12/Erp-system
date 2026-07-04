const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT *, payment_type FROM rent';
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
    const { property_name, landlord_name, amount, rent_date, status, notes, module_type, payment_type, rent_type, is_property, rent_month } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    const result = await pool.query(
      'INSERT INTO rent (property_name, landlord_name, amount, rent_date, status, notes, user_id, module_type, payment_type, rent_type, is_property, rent_month) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [property_name, landlord_name, amount || 0, rent_date || new Date().toLocaleDateString('en-CA'), status || 'Paid', notes, req.user.id, finalModule, payment_type || 'Cash', rent_type || 'Paid', is_property === true || is_property === 'true', rent_month || null]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { property_name, landlord_name, amount, rent_date, status, notes, payment_type, rent_type, is_property, rent_month } = req.body;
    const result = await pool.query(
      'UPDATE rent SET property_name=$1, landlord_name=$2, amount=$3, rent_date=$4, status=$5, notes=$6, payment_type=$7, rent_type=$8, is_property=$9, rent_month=$10 WHERE id=$11 AND (module_type=$12 OR $13) RETURNING *',
      [property_name, landlord_name, amount || 0, rent_date, status || 'Paid', notes, payment_type, rent_type || 'Paid', is_property === true || is_property === 'true', rent_month || null, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM rent WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
