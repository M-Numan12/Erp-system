const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

// Helper: get sum with optional date range
const getSum = async (table, amountCol, moduleType, moduleCol, dateCol, fromDate, toDate, extraCond = '') => {
  let conditions = [];
  let params = [];

  if (moduleType) {
    if (moduleType === 'Wholesale') {
      conditions.push(`(${moduleCol} = 'Wholesale' OR ${moduleCol} IS NULL)`);
    } else {
      params.push(moduleType);
      conditions.push(`${moduleCol} = $${params.length}`);
    }
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
  const counters = ['Wholesale', 'Retail 1', 'Retail 2', 'Retail 3'];
  const summary = {};

  const fetchCounterData = async (c) => {
    const [sales, expenses, rent, salary, other, supply] = await Promise.all([
      getSum('sales', 'paid_amount', c, 'sale_type', 'created_at', fromDate, toDate),
      getSum('expenses',       'amount',      c, 'module_type',  'created_at',    fromDate, toDate, "payment_type != 'Pending' AND expense_type NOT IN ('Galla Closeout', 'Admin Payment', 'Sale Return', 'Sale Return Refund')"),
      getSum('rent',           'amount',      c, 'module_type',  'rent_date',     fromDate, toDate),
      getSum('salary_payments', 'amount',      c, 'module_type',  'payment_date',  fromDate, toDate),
      getSum('other_expenses', 'amount',      c, 'module_type',  'date',          fromDate, toDate),
      getSum('purchases',      'paid_amount', c, 'module_type',  'purchase_date', fromDate, toDate)
    ]);

    const totalExpenses = expenses + rent + salary + other + supply;

    // Actual Sales Profit (Gross Profit based on product cost price vs sold price)
    const salesProfitQuery = c === 'Wholesale'
      ? `SELECT COALESCE(SUM(si.subtotal - (si.qty * COALESCE(p.cost_price, 0))), 0) as profit
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         LEFT JOIN products p ON p.id = si.product_id
         WHERE (s.sale_type = 'Wholesale' OR s.sale_type IS NULL)
         ${fromDate ? `AND s.created_at >= $1` : ''}
         ${toDate ? `AND s.created_at <= $${fromDate ? 2 : 1}` : ''}`
      : `SELECT COALESCE(SUM(si.subtotal - (si.qty * COALESCE(p.cost_price, 0))), 0) as profit
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         LEFT JOIN products p ON p.id = si.product_id
         WHERE s.sale_type = $1
         ${fromDate ? `AND s.created_at >= $2` : ''}
         ${toDate ? `AND s.created_at <= $${fromDate ? 3 : 2}` : ''}`;

    const salesProfitParams = c === 'Wholesale'
      ? [...(fromDate ? [`${fromDate} 00:00:00`] : []), ...(toDate ? [`${toDate} 23:59:59`] : [])]
      : [c, ...(fromDate ? [`${fromDate} 00:00:00`] : []), ...(toDate ? [`${toDate} 23:59:59`] : [])];

    const salesProfitRes = await pool.query(salesProfitQuery, salesProfitParams);
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
    if (!isAdmin(req)) {
      const userModule = req.user.module_type || 'Retail 1';
      const filtered = {};
      filtered[userModule] = summary[userModule];
      return res.json(filtered);
    }
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/profit/detail/:counter?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/detail/:counter', auth, async (req, res) => {
  try {
    const c = decodeURIComponent(req.params.counter);
    if (!isAdmin(req)) {
      const userModule = req.user.module_type || 'Retail 1';
      if (c !== userModule) {
        return res.status(403).json({ error: 'Unauthorized: Cannot view details of other counters' });
      }
    }
    let { from, to } = req.query;
    if (from) from = `${from} 00:00:00`;
    if (to)   to   = `${to} 23:59:59`;

    const isWholesale = c === 'Wholesale';
    const salesFilter = isWholesale ? "(s.sale_type = 'Wholesale' OR s.sale_type IS NULL)" : "s.sale_type = $1";
    const expensesFilter = isWholesale ? "(module_type = 'Wholesale' OR module_type IS NULL)" : "module_type = $1";
    const rentFilter = isWholesale ? "(module_type = 'Wholesale' OR module_type IS NULL)" : "module_type = $1";
    const salaryFilter = isWholesale ? "(sp.module_type = 'Wholesale' OR sp.module_type IS NULL)" : "sp.module_type = $1";
    const otherFilter = isWholesale ? "(module_type = 'Wholesale' OR module_type IS NULL)" : "module_type = $1";
    const investFilter = isWholesale ? "(module_type = 'Wholesale' OR module_type IS NULL)" : "module_type = $1";
    const supplyFilter = isWholesale ? "(p.module_type = 'Wholesale' OR p.module_type IS NULL)" : "p.module_type = $1";

    const getParams = (extraParams) => {
      return isWholesale ? extraParams : [c, ...extraParams];
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
       WHERE ${salesFilter}
       ${from ? `AND s.created_at >= $${isWholesale ? 1 : 2}` : ''}
       ${to ? `AND s.created_at <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       GROUP BY s.id, s.customer_name, s.net_amount, s.paid_amount, s.balance_amount, s.payment_type, s.created_at
       ORDER BY s.created_at DESC LIMIT 100`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Expenses
    const expensesRes = await pool.query(
      `SELECT id, description, amount, created_at as expense_date, expense_type FROM expenses WHERE ${expensesFilter}
       ${from ? `AND created_at >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND created_at <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY created_at DESC LIMIT 50`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Rent
    const rentRes = await pool.query(
      `SELECT id, property_name, landlord_name, amount, rent_date, status FROM rent WHERE ${rentFilter}
       ${from ? `AND rent_date >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND rent_date <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY rent_date DESC LIMIT 50`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Salary
    const salaryRes = await pool.query(
      `SELECT sp.id, sp.employee_name, s.designation, sp.amount, sp.payment_date, sp.transaction_type as status 
       FROM salary_payments sp
       LEFT JOIN salary s ON sp.staff_id = s.id
       WHERE ${salaryFilter}
       ${from ? `AND sp.payment_date >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND sp.payment_date <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY sp.payment_date DESC LIMIT 50`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Other expenses
    const otherRes = await pool.query(
      `SELECT id, title, category, amount, date, payment_method FROM other_expenses WHERE ${otherFilter}
       ${from ? `AND date >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND date <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY date DESC LIMIT 50`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Investments
    const investRes = await pool.query(
      `SELECT id, title, amount, date, investor FROM investment WHERE ${investFilter}
       ${from ? `AND date >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND date <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY date DESC LIMIT 30`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // All products breakdown
    const productsRes = await pool.query(
      `SELECT si.product_name, SUM(si.qty) as total_qty, SUM(si.subtotal) as total_revenue,
              COALESCE(SUM(si.subtotal - (si.qty * COALESCE(p.cost_price, 0))), 0) as total_profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE ${salesFilter} ${from ? `AND s.created_at >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND s.created_at <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       GROUP BY si.product_name ORDER BY total_revenue DESC`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
    );

    // Supply Chain (Purchases)
    const supplyRes = await pool.query(
      `SELECT p.id, s.name as supplier_name, p.paid_amount, p.purchase_date as date, p.vehicle_number
       FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
       WHERE ${supplyFilter} ${from ? `AND p.purchase_date >= $${isWholesale ? 1 : 2}` : ''} ${to ? `AND p.purchase_date <= $${isWholesale ? (from ? 2 : 1) : (from ? 3 : 2)}` : ''}
       ORDER BY p.purchase_date DESC LIMIT 50`,
      getParams([...(from ? [from] : []), ...(to ? [to] : [])])
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
      topProducts: productsRes.rows.slice(0, 10),
      allProducts: productsRes.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
