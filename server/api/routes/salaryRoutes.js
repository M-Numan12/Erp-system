const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const currentMonth = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', month: 'long', year: 'numeric' });
    
    let query = `
      SELECT s.*, 
        COALESCE(
          (SELECT TRUE FROM salary_payments sp 
           WHERE sp.staff_id = s.id 
             AND sp.month = $1 
             AND sp.transaction_type = 'Salary' 
           LIMIT 1), 
          FALSE
        ) AS is_paid_current_month
      FROM salary s
    `;
    let params = [currentMonth];

    if (isAdmin(req)) {
      if (type) {
        query += ' WHERE s.module_type = $2';
        params.push(type);
      }
    } else {
      query += ' WHERE s.module_type = $2';
      params.push(req.user.module_type || 'Retail 1');
    }

    query += ' ORDER BY s.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { 
      employee_name, designation, cnic, amount, salary_amount,
      advance_salary, joining_date, payment_date, status, notes, module_type 
    } = req.body;
    
    const finalAmount = salary_amount || amount || 0;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const month = payment_date 
      ? new Date(payment_date).toLocaleString('default', { month: 'long', year: 'numeric' }) 
      : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const result = await pool.query(
      `INSERT INTO salary 
      (employee_name, designation, cnic, amount, advance_salary, joining_date, payment_date, month, status, notes, user_id, module_type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        employee_name, designation, cnic, finalAmount, Math.abs(parseFloat(advance_salary || 0)), 
        joining_date, payment_date, month, status || 'Paid', notes, req.user.id, finalModule
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      employee_name, designation, cnic, amount, salary_amount,
      advance_salary, joining_date, payment_date, status, notes 
    } = req.body;

    const finalAmount = salary_amount || amount || 0;
    const month = payment_date 
      ? new Date(payment_date).toLocaleString('default', { month: 'long', year: 'numeric' }) 
      : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    const result = await pool.query(
      `UPDATE salary SET 
        employee_name=$1, designation=$2, cnic=$3, amount=$4, advance_salary=$5, 
        joining_date=$6, payment_date=$7, month=$8, status=$9, notes=$10 
      WHERE id=$11 AND (module_type=$12 OR $13) RETURNING *`,
      [
        employee_name, designation, cnic, finalAmount, Math.abs(parseFloat(advance_salary || 0)),
        joining_date, payment_date, month, status, notes, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// New endpoint to fetch combined payments history for staff ledger
router.get('/ledger/:name', auth, async (req, res) => {
  try {
    let query = 'SELECT * FROM salary_payments WHERE employee_name = $1';
    let params = [req.params.name];
    if (!isAdmin(req)) {
      query += ' AND module_type = $2';
      params.push(req.user.module_type || 'Retail 1');
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get pending deductions for an employee
router.get('/deductions/pending/:staffId', auth, async (req, res) => {
  try {
    const { month } = req.query;
    if (!isAdmin(req)) {
      const staffRes = await pool.query('SELECT module_type FROM salary WHERE id = $1', [req.params.staffId]);
      if (staffRes.rows.length === 0 || staffRes.rows[0].module_type !== req.user.module_type) {
        return res.status(403).json({ error: 'Unauthorized: Staff member counter mismatch' });
      }
    }
    let query = 'SELECT * FROM salary_deductions WHERE staff_id = $1 AND is_applied = FALSE';
    let params = [req.params.staffId];
    if (month) {
      query += ' AND target_month = $2';
      params.push(month);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add scheduled deduction for advance
router.post('/deductions', auth, async (req, res) => {
  try {
    const { staff_id, amount, target_month, notes } = req.body;
    if (!isAdmin(req)) {
      const staffRes = await pool.query('SELECT module_type FROM salary WHERE id = $1', [staff_id]);
      if (staffRes.rows.length === 0 || staffRes.rows[0].module_type !== req.user.module_type) {
        return res.status(403).json({ error: 'Unauthorized: Staff member counter mismatch' });
      }
    }
    const result = await pool.query(
      `INSERT INTO salary_deductions (staff_id, amount, target_month, notes) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [staff_id, amount, target_month, notes]
    );
    res.json({ success: true, record: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Process Payment Endpoint
router.post('/pay', auth, async (req, res) => {
  try {
    const { 
      staff_id, employee_name, amount, payment_type, 
      transaction_type, month, payment_date, notes, module_type 
    } = req.body;
    
    if (!isAdmin(req) && staff_id) {
      const staffRes = await pool.query('SELECT module_type FROM salary WHERE id = $1', [staff_id]);
      if (staffRes.rows.length === 0 || staffRes.rows[0].module_type !== req.user.module_type) {
        return res.status(403).json({ error: 'Unauthorized: Staff member counter mismatch' });
      }
    }
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const targetMonth = month || new Date(payment_date || new Date()).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Prevent duplicate salary payments for the same month
    if (transaction_type === 'Salary' && staff_id) {
      const checkRes = await pool.query(
        "SELECT id FROM salary_payments WHERE staff_id = $1 AND month = $2 AND transaction_type = 'Salary'",
        [staff_id, targetMonth]
      );
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: `Salary for ${employee_name} for the month of ${targetMonth} has already been paid!` });
      }
    }

    // Insert payment into log
    const payRes = await pool.query(
      `INSERT INTO salary_payments 
      (staff_id, employee_name, amount, payment_type, transaction_type, month, payment_date, notes, module_type, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [staff_id, employee_name, amount, payment_type || 'Cash', transaction_type || 'Salary', targetMonth, payment_date || 'NOW()', notes, finalModule, req.user.id]
    );

    // Update staff record advance balance if this is an Advance interaction
    if (staff_id) {
      if (transaction_type === 'Advance Given') {
        await pool.query('UPDATE salary SET advance_salary = COALESCE(advance_salary, 0) + $1 WHERE id = $2', [amount, staff_id]);
      } else if (transaction_type === 'Advance Returned' || transaction_type === 'Deduct from Advance') {
        await pool.query('UPDATE salary SET advance_salary = COALESCE(advance_salary, 0) - $1 WHERE id = $2', [amount, staff_id]);
      } else if (transaction_type === 'Salary') {
        // 🛡️ AUTOMATIC DEDUCTION ENGINE
        // Fetch scheduled cuts for this month that aren't applied yet!
        const deductionsRes = await pool.query(
          'SELECT * FROM salary_deductions WHERE staff_id = $1 AND target_month = $2 AND is_applied = FALSE',
          [staff_id, targetMonth]
        );
        if (deductionsRes.rows.length > 0) {
          const totalDeduction = deductionsRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
          
          // 1. Mark scheduled entries as applied
          await pool.query(
            'UPDATE salary_deductions SET is_applied = TRUE WHERE staff_id = $1 AND target_month = $2',
            [staff_id, targetMonth]
          );
          // 2. Relieve employee's outstanding advance debt by this amount!
          await pool.query('UPDATE salary SET advance_salary = COALESCE(advance_salary, 0) - $1 WHERE id = $2', [totalDeduction, staff_id]);
          
          // 3. Log internal non-cash adjustment entry to preserve financial ledger traces
          await pool.query(
            `INSERT INTO salary_payments 
            (staff_id, employee_name, amount, payment_type, transaction_type, month, payment_date, notes, module_type, user_id)
            VALUES ($1, $2, $3, 'Internal System Adjustment', 'Deduct from Advance', $4, NOW(), $5, $6, $7)`,
            [staff_id, employee_name, totalDeduction, targetMonth, `Auto-deducted scheduled advance from ${targetMonth} Salary Payout`, finalModule, req.user.id]
          );
        }
      }
    }

    res.json({ success: true, record: payRes.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all salary payments
router.get('/payments', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM salary_payments';
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

    query += ' ORDER BY payment_date DESC, id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM salary WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

