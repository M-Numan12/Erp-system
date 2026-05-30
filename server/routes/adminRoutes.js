const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// POST /api/admin/delete-retail2
// Admin only - deletes ALL Retail 2 data from all tables
router.post('/delete-retail2', auth, async (req, res) => {
  // Only admin can do this
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }

  const results = {};
  const MODULE = 'Retail 2';

  try {
    // 1. Delete sale_items linked to Retail 2 sales (via user_id of retail2 users)
    try {
      // First find all Retail 2 user ids
      const retail2Users = await pool.query(`SELECT id FROM users WHERE module_type = $1`, [MODULE]);
      const userIds = retail2Users.rows.map(r => r.id);

      if (userIds.length > 0) {
        // Delete sale_items for those users' sales
        const salesRes = await pool.query(`SELECT id FROM sales WHERE user_id = ANY($1)`, [userIds]);
        const saleIds = salesRes.rows.map(r => r.id);
        if (saleIds.length > 0) {
          const si = await pool.query(`DELETE FROM sale_items WHERE sale_id = ANY($1)`, [saleIds]);
          results.sale_items = si.rowCount;
        } else results.sale_items = 0;

        // Delete sales
        const s = await pool.query(`DELETE FROM sales WHERE user_id = ANY($1)`, [userIds]);
        results.sales = s.rowCount;
      } else {
        results.sale_items = 0;
        results.sales = 0;
      }
    } catch (e) { results.sales_error = e.message; }

    // 2. Tables with module_type column
    const tables = [
      'salary_payments', 'salary', 'labour_work_history', 'labours',
      'purchases', 'expenses', 'other_expenses', 'rent', 'investments',
      'customers', 'suppliers', 'products', 'bank_accounts'
    ];

    for (const table of tables) {
      try {
        const r = await pool.query(`DELETE FROM ${table} WHERE module_type = $1`, [MODULE]);
        results[table] = r.rowCount;
      } catch (e) {
        results[`${table}_error`] = e.message;
      }
    }

    // 3. Delete salary_deductions (linked via staff_id)
    try {
      const r = await pool.query(
        `DELETE FROM salary_deductions WHERE staff_id NOT IN (SELECT id FROM salary)`
      );
      results.salary_deductions = r.rowCount;
    } catch (e) { results.salary_deductions_error = e.message; }

    // 4. Delete Retail 2 users last
    try {
      const r = await pool.query(`DELETE FROM users WHERE module_type = $1`, [MODULE]);
      results.users = r.rowCount;
    } catch (e) { results.users_error = e.message; }

    return res.json({ success: true, deleted: results, msg: 'Retail 2 data deleted successfully!' });

  } catch (err) {
    console.error('Delete Retail 2 error:', err);
    return res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
