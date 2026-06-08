const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';
const isMasterAdmin = (req) => req.user.role === 'admin' && req.user.email === 'admin@erp.com';

const checkAccountMatch = (paymentMethod, acc) => {
  if (!paymentMethod || !acc) return false;
  const cl = paymentMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
  
  const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
  const isCashAcc = (acc.bank_name || '').toLowerCase().trim() === 'cash' || (acc.bank_name || '').toLowerCase().trim() === 'cash account';
  
  if (isCashPT) {
    return isCashAcc;
  }
  if (isCashAcc) return false;

  // Match by last 4 digits of account number
  const digits = acc.account_number ? acc.account_number.slice(-4) : '';
  const starDigitsMatch = cl.match(/\*\*\*\*(\d+)/);
  const generalDigitsMatch = cl.match(/\d{4,}/);
  const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[0] : null);

  if (paymentDigits) {
    return digits === paymentDigits;
  }

  const bl = (acc.bank_name || '').toLowerCase().trim();
  
  // Exact or contains match
  if (cl.includes(bl) || bl.includes(cl)) {
    return true;
  }

  // Normalize strings by removing non-alphanumeric characters
  const normCl = cl.replace(/[^a-z0-9]/g, '');
  const normBl = bl.replace(/[^a-z0-9]/g, '');
  
  if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) {
    return true;
  }

  // Special prefix match for jazz / jazz cash
  if (normCl.startsWith('jazz') && normBl.startsWith('jazz')) {
    return true;
  }

  return false;
};

// Get real-time balances for all accounts
router.get('/balances', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';
    const targetModule = req.query.type || req.user.module_type || 'Wholesale';

    // Fetch accounts relevant to the module only
    let accountsQ = 'SELECT bank_name, account_number, opening_balance FROM bank_accounts WHERE COALESCE(module_type, \'Wholesale\') = $1';
    const accountsRes = await pool.query(accountsQ, [targetModule]);
    
    // Ensure Cash is always present as a base
    const balances = { 'Cash': 0 };
    accountsRes.rows.forEach(acc => {
      let name = acc.bank_name.replace(' Account', '');
      if (name.toLowerCase() === 'cash' || name.toLowerCase() === 'cash account') {
        name = 'Cash';
      } else {
        const digits = acc.account_number ? acc.account_number.slice(-4) : '';
        name = `${acc.bank_name} ${digits ? `(****${digits})` : ''}`;
      }
      balances[name] = parseFloat(acc.opening_balance) || 0;
    });

    const findBalanceKey = (methodName) => {
      if (!methodName) return 'Cash';
      const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
      const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
      if (isCashPT) return 'Cash';

      const match = accountsRes.rows.find(acc => checkAccountMatch(methodName, acc));
      if (match) {
        const digits = match.account_number ? match.account_number.slice(-4) : '';
        return `${match.bank_name} ${digits ? `(****${digits})` : ''}`;
      }
      return methodName.replace(/^bank\s*-\s*/i, '').trim();
    };

    // Fetch transactions strictly for the current module
    const salesRes = await pool.query("SELECT net_amount, paid_amount, payment_type, created_at FROM sales WHERE COALESCE(sale_type, 'Wholesale') = $1", [targetModule]);
    const purchasesRes = await pool.query("SELECT id, supplier_id, paid_amount, payment_type, purchase_date FROM purchases WHERE COALESCE(module_type, 'Wholesale') = $1", [targetModule]);
    const expensesRes = await pool.query("SELECT amount, payment_type, expense_type, created_at FROM expenses WHERE COALESCE(module_type, 'Wholesale') = $1", [targetModule]);
    const salariesRes = await pool.query("SELECT amount, payment_type, created_at FROM salary_payments WHERE COALESCE(module_type, 'Wholesale') = $1", [targetModule]);
    const rentsRes = await pool.query("SELECT amount, created_at FROM rent");
    const investmentsRes = await pool.query("SELECT amount, created_at, date FROM investment");
    const otherExpensesRes = await pool.query("SELECT amount, payment_method, created_at, date FROM other_expenses WHERE COALESCE(module_type, 'Wholesale') = $1", [targetModule]);

    const transactions = [];

    salesRes.rows.forEach(s => transactions.push({ type: 'income', payment_type: s.payment_type, amount: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at || 0), id: s.id }));
    purchasesRes.rows.forEach(p => transactions.push({ type: 'expense', payment_type: p.payment_type, amount: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date || 0), id: p.id, supplier_id: p.supplier_id }));
    expensesRes.rows.forEach(e => {
      const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
      transactions.push({ type: isIncome ? 'income' : 'expense', payment_type: e.payment_type, amount: parseFloat(e.amount) || 0, date: new Date(e.created_at || 0) });
    });
    salariesRes.rows.forEach(s => transactions.push({ type: 'expense', payment_type: s.payment_type || 'Cash', amount: parseFloat(s.amount) || 0, date: new Date(s.created_at || 0) }));
    rentsRes.rows.forEach(r => transactions.push({ type: 'expense', payment_type: 'Cash', amount: parseFloat(r.amount) || 0, date: new Date(r.created_at || 0) }));
    investmentsRes.rows.forEach(i => transactions.push({ type: 'income', payment_type: 'Cash', amount: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date || 0) }));
    otherExpensesRes.rows.forEach(o => transactions.push({ type: 'expense', payment_type: o.payment_method || 'Cash', amount: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date || 0) }));

    transactions.sort((a, b) => a.date - b.date);

    transactions.forEach((t) => {
      let key = findBalanceKey(t.payment_type);
      if (!balances[key]) balances[key] = 0;
      if (t.type === 'income') balances[key] += t.amount;
      else balances[key] -= t.amount;
    });

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all banks
router.get('/', auth, async (req, res) => {
  try {
    const includeRecipients = req.query.include_recipients === 'true';
    const isAdminUser = req.user.role === 'admin';
    let result;
    if (isAdminUser) {
      // Admins see all bank accounts available across all counter flows
      if (includeRecipients) {
        result = await pool.query('SELECT * FROM bank_accounts ORDER BY id ASC');
      } else {
        result = await pool.query("SELECT * FROM bank_accounts WHERE COALESCE(module_type, '') != 'Admin Recipient' ORDER BY id ASC");
      }
    } else {
      // Everyone else sees their own banks, those added for their shop
      if (includeRecipients) {
        result = await pool.query(
          "SELECT * FROM bank_accounts WHERE user_id = $1 OR module_type = $2 OR module_type = 'Admin Recipient' ORDER BY id ASC",
          [req.user.id, req.user.module_type || 'Retail 1']
        );
      } else {
        result = await pool.query(
          "SELECT * FROM bank_accounts WHERE (user_id = $1 OR module_type = $2) AND COALESCE(module_type, '') != 'Admin Recipient' ORDER BY id ASC",
          [req.user.id, req.user.module_type || 'Retail 1']
        );
      }
    }
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a bank
router.post('/', auth, async (req, res) => {
  try {
    const { bank_name, account_title, account_number, opening_balance, module_type, is_admin_recipient } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    
    let targetUserId = req.user.id;
    let targetModule = finalModule;
    
    if (is_admin_recipient) {
      const adminRes = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminRes.rows.length > 0) {
        targetUserId = adminRes.rows[0].id;
        targetModule = 'Admin Recipient';
      }
    }

    const finalOpeningBalance = opening_balance || 0;

    const result = await pool.query(
      'INSERT INTO bank_accounts (bank_name, account_title, account_number, opening_balance, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [bank_name, account_title, account_number, finalOpeningBalance, targetUserId, targetModule]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a bank account
router.put('/:id', auth, async (req, res) => {
  try {
    const { bank_name, account_title, account_number, opening_balance, module_type } = req.body;
    let result;
    if (isAdmin(req)) {
      result = await pool.query(
        'UPDATE bank_accounts SET bank_name=$1, account_title=$2, account_number=$3, opening_balance=$4, module_type=$5 WHERE id=$6 RETURNING *',
        [bank_name, account_title, account_number, opening_balance || 0, module_type || 'Wholesale', req.params.id]
      );
    } else {
      result = await pool.query(
        'UPDATE bank_accounts SET bank_name=$1, account_title=$2, account_number=$3, opening_balance=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
        [bank_name, account_title, account_number, opening_balance || 0, req.params.id, req.user.id]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a bank
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await pool.query('DELETE FROM bank_accounts WHERE id=$1', [req.params.id]);
    } else {
      await pool.query('DELETE FROM bank_accounts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    }
    res.json({ message: 'Bank deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Current Balance for a payment method
router.get('/balance/:method', auth, async (req, res) => {
  try {
    const { method } = req.params;
    const { module_type } = req.query;
    const finalModule = module_type || req.user.module_type || 'Wholesale';
    const userId = req.user.id;
    const isAdminUser = req.user.role === 'admin';

    // 1. Fetch bank accounts opening balances
    let accountsQ = 'SELECT bank_name, account_number, opening_balance FROM bank_accounts';
    let params = [];
    if (!isAdminUser) {
      accountsQ += " WHERE user_id = $1 OR COALESCE(module_type, 'Wholesale') = $2";
      params.push(userId, finalModule);
    } else {
      accountsQ += " WHERE COALESCE(module_type, 'Wholesale') = $1";
      params.push(finalModule);
    }
    const accountsRes = await pool.query(accountsQ, params);
    
    const balances = { 'Cash': 0 };
    accountsRes.rows.forEach(acc => {
      let name = acc.bank_name.replace(' Account', '');
      if (name.toLowerCase() === 'cash' || name.toLowerCase() === 'cash account') {
        name = 'Cash';
      } else {
        const digits = acc.account_number ? acc.account_number.slice(-4) : '';
        name = `${acc.bank_name} ${digits ? `(****${digits})` : ''}`;
      }
      balances[name] = parseFloat(acc.opening_balance) || 0;
    });



    const findBalanceKey = (methodName) => {
      if (!methodName) return 'Cash';
      const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
      const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
      if (isCashPT) return 'Cash';

      const match = accountsRes.rows.find(acc => checkAccountMatch(methodName, acc));
      if (match) {
        const digits = match.account_number ? match.account_number.slice(-4) : '';
        return `${match.bank_name} ${digits ? `(****${digits})` : ''}`;
      }

      return methodName.replace(/^bank\s*-\s*/i, '').trim();
    };

    // 2. Fetch sales
    let salesQ = "SELECT net_amount, paid_amount, payment_type, created_at FROM sales WHERE COALESCE(sale_type, 'Wholesale') = $1";
    const salesRes = await pool.query(salesQ, [finalModule]);

    // 3. Fetch purchases & supplier payments
    let purchasesQ = "SELECT id, supplier_id, paid_amount, payment_type, purchase_date FROM purchases WHERE COALESCE(module_type, 'Wholesale') = $1";
    const purchasesRes = await pool.query(purchasesQ, [finalModule]);

    // 4. Fetch expenses
    let expensesQ = "SELECT amount, payment_type, expense_type, created_at FROM expenses WHERE COALESCE(module_type, 'Wholesale') = $1";
    const expensesRes = await pool.query(expensesQ, [finalModule]);

    // 5. Fetch actual salaries paid from salary_payments
    let salariesQ = "SELECT amount, payment_type, created_at FROM salary_payments WHERE COALESCE(module_type, 'Wholesale') = $1";
    const salariesRes = await pool.query(salariesQ, [finalModule]);

    // 6. Fetch rents
    let rentsQ = "SELECT amount, created_at FROM rent WHERE COALESCE(module_type, 'Wholesale') = $1";
    const rentsRes = await pool.query(rentsQ, [finalModule]);

    // 7. Fetch investments
    let investmentsQ = "SELECT amount, created_at, date FROM investment WHERE COALESCE(module_type, 'Wholesale') = $1";
    const investmentsRes = await pool.query(investmentsQ, [finalModule]);

    // 8. Fetch other expenses
    let otherExpensesQ = "SELECT amount, payment_method, created_at, date FROM other_expenses WHERE COALESCE(module_type, 'Wholesale') = $1";
    const otherExpensesRes = await pool.query(otherExpensesQ, [finalModule]);

    // Chronological transactions consolidation
    const transactions = [];

    salesRes.rows.forEach(s => {
      transactions.push({
        type: 'income',
        payment_type: s.payment_type,
        amount: parseFloat(s.paid_amount) || 0,
        date: new Date(s.created_at || 0),
        id: s.id
      });
    });

    purchasesRes.rows.forEach(p => {
      transactions.push({
        type: 'expense',
        payment_type: p.payment_type,
        amount: parseFloat(p.paid_amount) || 0,
        date: new Date(p.purchase_date || 0),
        id: p.id,
        supplier_id: p.supplier_id
      });
    });

    expensesRes.rows.forEach(e => {
      const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
      transactions.push({
        type: isIncome ? 'income' : 'expense',
        payment_type: e.payment_type,
        amount: parseFloat(e.amount) || 0,
        date: new Date(e.created_at || 0)
      });
    });

    salariesRes.rows.forEach(s => {
      transactions.push({
        type: 'expense',
        payment_type: s.payment_type || 'Cash',
        amount: parseFloat(s.amount) || 0,
        date: new Date(s.created_at || 0)
      });
    });

    rentsRes.rows.forEach(r => {
      transactions.push({
        type: 'expense',
        payment_type: 'Cash',
        amount: parseFloat(r.amount) || 0,
        date: new Date(r.created_at || 0)
      });
    });

    investmentsRes.rows.forEach(i => {
      transactions.push({
        type: 'income',
        payment_type: 'Cash',
        amount: parseFloat(i.amount) || 0,
        date: new Date(i.created_at || i.date || 0)
      });
    });

    otherExpensesRes.rows.forEach(o => {
      transactions.push({
        type: 'expense',
        payment_type: o.payment_method || 'Cash',
        amount: parseFloat(o.amount) || 0,
        date: new Date(o.created_at || o.date || 0)
      });
    });

    // Sort ascending by date
    transactions.sort((a, b) => a.date - b.date);

    const thresholdIdx = transactions.findIndex(t => 
      Number(t.id) === 218
    );

    // Apply transactions chronologically with Cash clamping to 0
    transactions.forEach((t, idx) => {
      let key = findBalanceKey(t.payment_type);
      if (!balances[key]) balances[key] = 0;
      
      if (t.type === 'income') {
        balances[key] += t.amount;
      } else {
        balances[key] -= t.amount;
        const shouldClamp = finalModule !== 'Retail 1' || (thresholdIdx !== -1 && idx < thresholdIdx);
        if (key === 'Cash' && balances[key] < 0 && shouldClamp) {
          balances[key] = 0;
        }
      }
    });

    const targetKey = findBalanceKey(method);
    const balance = balances[targetKey] || 0;

    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Closeout / Galla Transfer
router.post('/closeout', auth, async (req, res) => {
  try {
    const { amount_sent_to_admin, amount_kept_as_opening, notes, payment_type, module_type } = req.body;
    const userId = req.user.id;
    const moduleType = module_type || req.user.module_type || 'Retail 1';

    // Insert closeout expense to deduct balance by the amount sent to Admin
    const result = await pool.query(
      `INSERT INTO expenses (description, expense_type, category, amount, payment_type, expense_date, notes, user_id, module_type) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8) RETURNING *`,
      [
        `Daily Galla Closeout: Handover to Admin`,
        'Galla Closeout',
        'Handover',
        amount_sent_to_admin,
        payment_type || 'Cash',
        notes || `Galla cleared. Opening balance Rs. ${amount_kept_as_opening} kept for tomorrow.`,
        userId,
        moduleType
      ]
    );

    res.json({ message: 'Register closed out successfully!', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send Admin Payment to Shop
router.post('/admin-payment', auth, async (req, res) => {
  try {
    const { amount, notes, payment_type, module_type } = req.body;
    const userId = req.user.id;
    const moduleType = module_type || req.user.module_type || 'Retail 1';

    const result = await pool.query(
      `INSERT INTO expenses (description, expense_type, category, amount, payment_type, expense_date, notes, user_id, module_type) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8) RETURNING *`,
      [
        `Received Admin Payment`,
        'Admin Payment',
        'Income',
        amount,
        payment_type || 'Cash',
        notes || `Received payment from Admin bank.`,
        userId,
        moduleType
      ]
    );

    res.json({ message: 'Admin payment sent/received successfully!', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post Internal Funds Transfer (Bank to Bank / Cash to Bank / Bank to Cash)
router.post('/transfer', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { source_account, destination_account, amount, notes, module_type } = req.body;
    const finalModule = module_type || req.user.module_type || 'Retail 1';
    const userId = req.user.id;
    const transferAmount = parseFloat(amount) || 0;

    if (transferAmount <= 0) throw new Error('Transfer amount must be greater than zero');
    if (source_account === destination_account) throw new Error('Source and Destination accounts cannot be the same');

    // 1. Insert Transfer Out (Deduction from Source)
    await client.query(
      `INSERT INTO expenses (description, expense_type, category, amount, payment_type, expense_date, notes, user_id, module_type) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
      [
        `Transfer to ${destination_account}`,
        'Transfer Out',
        'Transfer',
        transferAmount,
        source_account,
        notes || `Internal transfer.`,
        userId,
        finalModule
      ]
    );

    // 2. Insert Transfer In (Addition to Destination)
    await client.query(
      `INSERT INTO expenses (description, expense_type, category, amount, payment_type, expense_date, notes, user_id, module_type) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8)`,
      [
        `Transfer from ${source_account}`,
        'Transfer In',
        'Transfer',
        transferAmount,
        destination_account,
        notes || `Internal transfer.`,
        userId,
        finalModule
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Transfer completed successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;