const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Helper: get sum with optional date range
const getSum = async (table, amountCol, moduleType, moduleCol, dateCol, fromDate, toDate, extraCond = '') => {
  let conditions = [];
  let params = [];

  if (moduleType) {
    params.push(moduleType);
    conditions.push(`${moduleCol} = $${params.length}`);
  }
  if (fromDate) {
    params.push(`${fromDate} 00:00:00`);
    conditions.push(`${dateCol} >= $${params.length}`);
  }
  if (toDate) {
    params.push(`${toDate} 23:59:59`);
    conditions.push(`${dateCol} <= $${params.length}`);
  }
  if (extraCond) {
    conditions.push(extraCond);
  }

  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  const query = `SELECT COALESCE(SUM(${amountCol}), 0) as total FROM ${table}${where}`;
  const result = await pool.query(query, params);
  return parseFloat(result.rows[0].total || 0);
};

// Build summary for all counters with date range
const buildSummary = async (fromDate, toDate) => {
  const counters = ['Wholesale', 'Retail 1', 'Retail 2'];
  const summary = {};

  const fetchCounterData = async (c) => {
    const [sales, expenses, rent, salary, other, supply] = await Promise.all([
      getSum('sales', 'paid_amount', c, 'sale_type', 'created_at', fromDate, toDate),
      getSum('expenses',       'amount',      c, 'module_type',  'created_at',    fromDate, toDate, "payment_type != 'Pending' AND expense_type NOT IN ('Galla Closeout', 'Admin Payment', 'Sale Return', 'Sale Return Refund')"),
      getSum('rent',           'amount',      c, 'module_type',  'rent_date',     fromDate, toDate),
      getSum('salary',         'amount',      c, 'module_type',  'payment_date',  fromDate, toDate),
      getSum('other_expenses', 'amount',      c, 'module_type',  'date',          fromDate, toDate),
      getSum('purchases',      'paid_amount', c, 'module_type',  'purchase_date', fromDate, toDate)
    ]);

    const totalExpenses = expenses + rent + salary + other + supply;

    // Actual Sales Profit (Gross Profit based on product cost price vs sold price)
    const salesProfitRes = await pool.query(
      `SELECT COALESCE(SUM(si.subtotal - (si.qty * COALESCE(p.cost_price, 0))), 0) as profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.sale_type = $1
       ${fromDate ? `AND s.created_at >= $2` : ''}
       ${toDate ? `AND s.created_at <= $${fromDate ? 3 : 2}` : ''}`,
      [c, ...(fromDate ? [`${fromDate} 00:00:00`] : []), ...(toDate ? [`${toDate} 23:59:59`] : [])]
    );
    const salesProfit = parseFloat(salesProfitRes.rows[0].profit || 0);

    return {
      counter: c,
      data: {
        sales,
        expenses,
        rent,
        salary,
        other,
        supply,
        totalExpenses,
        netProfit: sales - totalExpenses,
        salesProfit
      }
    };
  };

  const results = await Promise.all(counters.map(fetchCounterData));
  results.forEach(res => {
    summary[res.counter] = res.data;
  });

  return summary;
};

// GET /api/profit/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const summary = await buildSummary(from || null, to || null);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/profit/detail/:counter?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/detail/:counter', auth, async (req, res) => {
  try {
    const c = decodeURIComponent(req.params.counter);
    let { from, to } = req.query;
    if (from) from = `${from} 00:00:00`;
    if (to)   to   = `${to} 23:59:59`;

    const dateFilter = (col) => {
      let conds = [`${col} IS NOT NULL`];
      let p = [c];
      if (from) { p.push(from); conds.push(`${col} >= $${p.length}`); }
      if (to)   { p.push(to);   conds.push(`${col} <= $${p.length}`); }
      return { p, conds };
    };

    // Sales
    const salesRes = await pool.query(
      `SELECT s.id, s.customer_name, s.net_amount, s.paid_amount, s.balance_amount, s.payment_type, s.created_at,
       (SELECT JSON_AGG(si) FROM (
         SELECT si.id, si.product_id, si.product_name as name, si.qty, si.rate, si.subtotal
         FROM sale_items si 
         WHERE si.sale_id = s.id
       ) si) as items,
       COALESCE(SUM(si.subtotal - (si.qty * COALESCE(p.cost_price, 0))), 0) as sale_profit
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.sale_type = $1
       ${from ? `AND s.created_at >= $2` : ''}
       ${to ? `AND s.created_at <= $${from ? 3 : 2}` : ''}
       GROUP BY s.id, s.customer_name, s.net_amount, s.paid_amount, s.balance_amount, s.payment_type, s.created_at
       ORDER BY s.created_at DESC LIMIT 100`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Expenses
    const expensesRes = await pool.query(
      `SELECT id, description, amount, created_at as expense_date, expense_type FROM expenses WHERE module_type = $1
       ${from ? `AND created_at >= $2` : ''} ${to ? `AND created_at <= $${from ? 3 : 2}` : ''}
       ORDER BY created_at DESC LIMIT 50`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Rent
    const rentRes = await pool.query(
      `SELECT id, property_name, landlord_name, amount, rent_date, status FROM rent WHERE module_type = $1
       ${from ? `AND rent_date >= $2` : ''} ${to ? `AND rent_date <= $${from ? 3 : 2}` : ''}
       ORDER BY rent_date DESC LIMIT 50`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Salary
    const salaryRes = await pool.query(
      `SELECT id, employee_name, designation, amount, payment_date, status FROM salary WHERE module_type = $1
       ${from ? `AND payment_date >= $2` : ''} ${to ? `AND payment_date <= $${from ? 3 : 2}` : ''}
       ORDER BY payment_date DESC LIMIT 50`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Other expenses
    const otherRes = await pool.query(
      `SELECT id, title, category, amount, date, payment_method FROM other_expenses WHERE module_type = $1
       ${from ? `AND date >= $2` : ''} ${to ? `AND date <= $${from ? 3 : 2}` : ''}
       ORDER BY date DESC LIMIT 50`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Investments
    const investRes = await pool.query(
      `SELECT id, title, amount, date, investor FROM investment WHERE module_type = $1
       ${from ? `AND date >= $2` : ''} ${to ? `AND date <= $${from ? 3 : 2}` : ''}
       ORDER BY date DESC LIMIT 30`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Top products
    const productsRes = await pool.query(
      `SELECT si.product_name, SUM(si.qty) as total_qty, SUM(si.subtotal) as total_revenue
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE s.sale_type = $1 ${from ? `AND s.created_at >= $2` : ''} ${to ? `AND s.created_at <= $${from ? 3 : 2}` : ''}
       GROUP BY si.product_name ORDER BY total_revenue DESC LIMIT 10`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    // Supply Chain (Purchases)
    const supplyRes = await pool.query(
      `SELECT p.id, s.name as supplier_name, p.paid_amount, p.purchase_date as date, p.vehicle_number
       FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.module_type = $1 ${from ? `AND p.purchase_date >= $2` : ''} ${to ? `AND p.purchase_date <= $${from ? 3 : 2}` : ''}
       ORDER BY p.purchase_date DESC LIMIT 50`,
      [c, ...(from ? [from] : []), ...(to ? [to] : [])]
    );

    res.json({
      counter: c,
      sales: salesRes.rows,
      expenses: expensesRes.rows,
      rent: rentRes.rows,
      salary: salaryRes.rows,
      other: otherRes.rows,
      investments: investRes.rows,
      supply: supplyRes.rows,
      topProducts: productsRes.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
