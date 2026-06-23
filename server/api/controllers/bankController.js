const pool = require('../config/db');

const isAdmin = (req) => req.user.role === 'admin';

const checkAccountMatch = (paymentMethod, acc) => {
  if (!paymentMethod || !acc) return false;
  const cl = paymentMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
  
  const bName = (acc.bank_name || '').toLowerCase().trim();
  const accNum = (acc.account_number || '').toLowerCase().trim();
  const accTitle = (acc.account_title || '').toLowerCase().trim();

  const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
  const isCashAcc = bName === 'cash' || bName === 'cash account' || accNum === 'cash' || accNum === 'cash account' || accTitle === 'main counter' || accTitle === 'cash' || accTitle === 'cash account';
  
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

  // Exact or contains match
  if (bName && (cl.includes(bName) || bName.includes(cl))) {
    return true;
  }

  // Normalize strings by removing non-alphanumeric characters
  const normCl = cl.replace(/[^a-z0-9]/g, '');
  const normBl = bName.replace(/[^a-z0-9]/g, '');
  
  if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) {
    return true;
  }

  // Special prefix match for jazz / jazz cash
  if (normCl.startsWith('jazz') && normBl.startsWith('jazz')) {
    return true;
  }

  return false;
};

async function updateBankAccountsCurrentBalances(poolOrClient) {
  try {
    const safeColName = 'current_balance';

    const allAccountsRes = await poolOrClient.query(
      "SELECT id, bank_name, account_title, account_number, opening_balance, module_type FROM bank_accounts"
    );
    const allAccounts = allAccountsRes.rows;
    
    const MODULES = ['Wholesale', 'Retail 1', 'Retail 2'];
    const updates = [];

    for (const mod of MODULES) {
      const modAccounts = allAccounts.filter(a =>
        (a.module_type || 'Wholesale') === mod && a.module_type !== 'Admin Recipient'
      );

      const cashAcc = modAccounts.find(a => {
        const bName = (a.bank_name || '').toLowerCase().trim();
        const accNum = (a.account_number || '').toLowerCase().trim();
        const accTitle = (a.account_title || '').toLowerCase().trim();
        return bName === 'cash' || bName === 'cash account' || accNum === 'cash' || accNum === 'cash account' || accTitle === 'main counter' || accTitle === 'cash' || accTitle === 'cash account';
      });
      const cashOpeningBal = cashAcc ? (parseFloat(cashAcc.opening_balance) || 0) : 0;

      const balMap = { Cash: cashOpeningBal };
      modAccounts.forEach(a => { balMap[a.id] = parseFloat(a.opening_balance) || 0; });

      const findKey = (methodName, accounts) => {
        if (!methodName) return 'Cash';
        const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
        if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') return 'Cash';
        const match = accounts.find(a => checkAccountMatch(methodName, a));
        return match ? match.id : 'GHOST';
      };

      const isWholesale = mod === 'Wholesale';
      const saleQ = isWholesale
        ? "SELECT id, paid_amount, payment_type, created_at FROM sales WHERE (sale_type = 'Wholesale' OR sale_type IS NULL)"
        : "SELECT id, paid_amount, payment_type, created_at FROM sales WHERE sale_type = $1";
      const purchQ = isWholesale
        ? "SELECT p.id, p.paid_amount, p.payment_type, p.delivery_charges, p.fare_payment_type, p.purchase_date FROM purchases p LEFT JOIN products pr ON p.product_id = pr.id WHERE (p.module_type = 'Wholesale' OR p.module_type IS NULL) AND pr.name IS NULL"
        : "SELECT p.id, p.paid_amount, p.payment_type, p.delivery_charges, p.fare_payment_type, p.purchase_date FROM purchases p LEFT JOIN products pr ON p.product_id = pr.id WHERE p.module_type = $1 AND pr.name IS NULL";
      const expQ = isWholesale
        ? "SELECT id, amount, payment_type, expense_type, created_at FROM expenses WHERE (module_type = 'Wholesale' OR module_type IS NULL)"
        : "SELECT id, amount, payment_type, expense_type, created_at FROM expenses WHERE module_type = $1";
      const salQ = isWholesale
        ? "SELECT id, amount, payment_type, created_at FROM salary_payments WHERE (module_type = 'Wholesale' OR module_type IS NULL)"
        : "SELECT id, amount, payment_type, created_at FROM salary_payments WHERE module_type = $1";
      const rentQ = isWholesale
        ? "SELECT id, amount, created_at FROM rent WHERE (module_type = 'Wholesale' OR module_type IS NULL)"
        : "SELECT id, amount, created_at FROM rent WHERE module_type = $1";
      const invQ = isWholesale
        ? "SELECT id, amount, created_at, date FROM investment WHERE (module_type = 'Wholesale' OR module_type IS NULL)"
        : "SELECT id, amount, created_at, date FROM investment WHERE module_type = $1";
      const otherExpQ = isWholesale
        ? "SELECT id, amount, payment_method, created_at, date FROM other_expenses WHERE (module_type = 'Wholesale' OR module_type IS NULL)"
        : "SELECT id, amount, payment_method, created_at, date FROM other_expenses WHERE module_type = $1";
      const qParams = isWholesale ? [] : [mod];

      const [sales, purchases, expenses, salaries, rents, investments, otherExp] = await Promise.all([
        poolOrClient.query(saleQ, qParams),
        poolOrClient.query(purchQ, qParams),
        poolOrClient.query(expQ, qParams),
        poolOrClient.query(salQ, qParams),
        poolOrClient.query(rentQ, qParams),
        poolOrClient.query(invQ, qParams),
        poolOrClient.query(otherExpQ, qParams),
      ]);

      const txns = [];
      sales.rows.forEach(s => txns.push({ id: s.id, type: 'income', pt: s.payment_type, amt: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at) }));
      
      purchases.rows.forEach(p => {
        txns.push({ id: p.id, type: 'expense', pt: p.payment_type, amt: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date) });
        const fare = parseFloat(p.delivery_charges) || 0;
        if (fare > 0) {
          txns.push({ id: p.id, type: 'expense', pt: p.fare_payment_type || 'Cash', amt: fare, date: new Date(p.purchase_date) });
        }
      });

      expenses.rows.forEach(e => {
        if (e.expense_type === 'Sale Return' || e.expense_type === 'Sale Return Refund') return;
        const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
        txns.push({ id: e.id, type: isIncome ? 'income' : 'expense', pt: e.payment_type, amt: parseFloat(e.amount) || 0, date: new Date(e.created_at) });
      });

      salaries.rows.forEach(s => txns.push({ id: s.id, type: 'expense', pt: 'Cash', amt: parseFloat(s.amount) || 0, date: new Date(s.created_at) }));
      rents.rows.forEach(r => txns.push({ id: r.id, type: 'expense', pt: 'Cash', amt: parseFloat(r.amount) || 0, date: new Date(r.created_at) }));
      investments.rows.forEach(i => txns.push({ id: i.id, type: 'income', pt: 'Cash', amt: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date) }));
      otherExp.rows.forEach(o => txns.push({ id: o.id, type: 'expense', pt: o.payment_method || 'Cash', amt: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date) }));

      txns.sort((a, b) => a.date - b.date);

      const thresholdIdx = txns.findIndex(t => Number(t.id) === 218);

      txns.forEach((t, idx) => {
        if (t.pt === 'Deduction') return;
        const key = findKey(t.pt, modAccounts);
        if (balMap[key] === undefined) balMap[key] = 0;
        
        if (t.type === 'income') {
          balMap[key] += t.amt;
        } else {
          balMap[key] -= t.amt;
          const shouldClamp = (thresholdIdx !== -1 && idx < thresholdIdx);
          if (key === 'Cash' && balMap[key] < 0 && shouldClamp) {
            balMap[key] = 0;
          }
        }
      });

      modAccounts.forEach(acc => {
        const bName = (acc.bank_name || '').toLowerCase().trim();
        const accNum = (acc.account_number || '').toLowerCase().trim();
        const accTitle = (acc.account_title || '').toLowerCase().trim();
        const isCash = bName === 'cash' || bName === 'cash account' || accNum === 'cash' || accNum === 'cash account' || accTitle === 'main counter' || accTitle === 'cash' || accTitle === 'cash account';
        const currentBal = isCash ? (balMap['Cash'] || 0) : (balMap[acc.id] || 0);
        updates.push({ id: acc.id, balance: currentBal });
      });
    }

    const adminAccounts = allAccounts.filter(a => a.module_type === 'Admin Recipient');
    if (adminAccounts.length > 0) {
      const allExpenses = await poolOrClient.query("SELECT amount, expense_type, notes FROM expenses WHERE expense_type IN ('Galla Closeout', 'Admin Payment') OR notes LIKE '%Recipient Bank%'");
      adminAccounts.forEach(acc => {
        const opening = parseFloat(acc.opening_balance) || 0;
        const received = allExpenses.rows
          .filter(e => (e.expense_type === 'Galla Closeout' || (e.notes || '').includes('Recipient Bank')) && (e.notes || '').includes(acc.bank_name) && (e.notes || '').includes(acc.account_number))
          .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const paid = allExpenses.rows
          .filter(e => e.expense_type === 'Admin Payment' && (e.notes || '').includes(acc.bank_name) && (e.notes || '').includes(acc.account_number))
          .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        updates.push({ id: acc.id, balance: opening + received - paid });
      });
    }

    for (const item of updates) {
      await poolOrClient.query(
        `UPDATE bank_accounts SET ${safeColName} = $1 WHERE id = $2`,
        [item.balance, item.id]
      );
    }
  } catch (err) {
    console.error('Error updating bank accounts current balances in DB:', err);
  }
}

// Get real-time balances for all accounts
exports.getBalances = async (req, res) => {
  try {
    await updateBankAccountsCurrentBalances(pool);
    const targetModule = isAdmin(req) ? (req.query.type || req.user.module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    const isRetailModule = targetModule === 'Retail 1' || targetModule === 'Retail 2';
    
    let accountsRes;
    if (isRetailModule) {
      accountsRes = await pool.query(
        "SELECT id, bank_name, account_title, account_number, current_balance, module_type FROM bank_accounts WHERE module_type = $1 ORDER BY id ASC",
        [targetModule]
      );
    } else {
      accountsRes = await pool.query(
        "SELECT id, bank_name, account_title, account_number, current_balance, module_type FROM bank_accounts WHERE (COALESCE(module_type, 'Wholesale') = $1 OR module_type = 'Admin Recipient') ORDER BY id ASC",
        [targetModule]
      );
    }

    const balances = { 'Cash': 0 };
    accountsRes.rows.forEach(acc => {
      const bName = (acc.bank_name || '').toLowerCase().trim();
      const accNum = (acc.account_number || '').toLowerCase().trim();
      const accTitle = (acc.account_title || '').toLowerCase().trim();
      
      const isCash = (bName === 'cash' || bName === 'cash account' || accNum === 'cash' || accNum === 'cash account' || accTitle === 'main counter' || accTitle === 'cash' || accTitle === 'cash account') && acc.module_type !== 'Admin Recipient';
      
      if (isCash) {
        balances['Cash'] = parseFloat(acc.current_balance) || 0;
      } else {
        const digits = acc.account_number ? acc.account_number.slice(-4) : '';
        const name = `${acc.bank_name} ${digits ? `(****${digits})` : ''}`;
        balances[name] = parseFloat(acc.current_balance) || 0;
      }
    });

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get real-time balances for ALL modules at once (Admin only)
exports.getAllBalances = async (req, res) => {
  try {
    await updateBankAccountsCurrentBalances(pool);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const allAccountsRes = await pool.query(
      "SELECT id, bank_name, account_title, account_number, opening_balance, module_type, current_balance FROM bank_accounts ORDER BY id ASC"
    );
    const result = allAccountsRes.rows.map(acc => {
      const bName = (acc.bank_name || '').toLowerCase().trim();
      const accNum = (acc.account_number || '').toLowerCase().trim();
      const accTitle = (acc.account_title || '').toLowerCase().trim();
      const isCash = bName === 'cash' || bName === 'cash account' || accNum === 'cash' || accNum === 'cash account' || accTitle === 'main counter' || accTitle === 'cash' || accTitle === 'cash account';
      return {
        id: acc.id,
        bank_name: acc.bank_name,
        account_title: acc.account_title,
        account_number: acc.account_number,
        opening_balance: parseFloat(acc.opening_balance) || 0,
        current_balance: parseFloat(acc.current_balance) || 0,
        module_type: acc.module_type === 'Admin Recipient' ? 'Admin' : acc.module_type,
        is_cash: isCash,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('all-balances error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all banks
exports.getBanks = async (req, res) => {
  try {
    await updateBankAccountsCurrentBalances(pool);
    const includeRecipients = req.query.include_recipients === 'true';
    const isAdminUser = req.user.role === 'admin';
    let result;
    if (isAdminUser) {
      if (includeRecipients) {
        result = await pool.query('SELECT * FROM bank_accounts ORDER BY id ASC');
      } else {
        result = await pool.query("SELECT * FROM bank_accounts WHERE COALESCE(module_type, '') != 'Admin Recipient' ORDER BY id ASC");
      }
    } else {
      if (includeRecipients) {
        result = await pool.query(
          "SELECT * FROM bank_accounts WHERE module_type = $1 OR module_type = 'Admin Recipient' ORDER BY id ASC",
          [req.user.module_type || 'Retail 1']
        );
      } else {
        result = await pool.query(
          "SELECT * FROM bank_accounts WHERE module_type = $1 AND COALESCE(module_type, '') != 'Admin Recipient' ORDER BY id ASC",
          [req.user.module_type || 'Retail 1']
        );
      }
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a bank
exports.addBank = async (req, res) => {
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
    await updateBankAccountsCurrentBalances(pool);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a bank account
exports.updateBank = async (req, res) => {
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
        'UPDATE bank_accounts SET bank_name=$1, account_title=$2, account_number=$3, opening_balance=$4 WHERE id=$5 AND module_type=$6 RETURNING *',
        [bank_name, account_title, account_number, opening_balance || 0, req.params.id, req.user.module_type || 'Retail 1']
      );
    }
    await updateBankAccountsCurrentBalances(pool);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a bank
exports.deleteBank = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await pool.query('DELETE FROM bank_accounts WHERE id=$1', [req.params.id]);
    } else {
      await pool.query('DELETE FROM bank_accounts WHERE id=$1 AND module_type=$2', [req.params.id, req.user.module_type || 'Retail 1']);
    }
    await updateBankAccountsCurrentBalances(pool);
    res.json({ message: 'Bank deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Current Balance for a payment method
exports.getMethodBalance = async (req, res) => {
  try {
    const { method } = req.params;
    const { module_type } = req.query;
    const isAdminUser = req.user.role === 'admin';
    const finalModule = isAdminUser ? (module_type || req.user.module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    await updateBankAccountsCurrentBalances(pool);

    let accountsQ = 'SELECT bank_name, account_number, current_balance FROM bank_accounts';
    let params = [];
    if (!isAdminUser) {
      accountsQ += " WHERE COALESCE(module_type, 'Wholesale') = $1";
      params.push(finalModule);
    } else {
      accountsQ += " WHERE COALESCE(module_type, 'Wholesale') = $1";
      params.push(finalModule);
    }
    const accountsRes = await pool.query(accountsQ, params);

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

    const balances = {};
    accountsRes.rows.forEach(acc => {
      let name = acc.bank_name.replace(' Account', '');
      if (name.toLowerCase() === 'cash' || name.toLowerCase() === 'cash account') {
        name = 'Cash';
      } else {
        const digits = acc.account_number ? acc.account_number.slice(-4) : '';
        name = `${acc.bank_name} ${digits ? `(****${digits})` : ''}`;
      }
      balances[name] = parseFloat(acc.current_balance) || 0;
    });

    const targetKey = findBalanceKey(method);
    const balance = balances[targetKey] || 0;

    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Register Closeout / Galla Transfer
exports.closeout = async (req, res) => {
  try {
    const { amount_sent_to_admin, amount_kept_as_opening, notes, payment_type, module_type } = req.body;
    const userId = req.user.id;
    const moduleType = module_type || req.user.module_type || 'Retail 1';

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
};

// Send Admin Payment to Shop
exports.adminPayment = async (req, res) => {
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
};

// Post Internal Funds Transfer
exports.transfer = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { source_account, destination_account, amount, notes, module_type } = req.body;
    const finalModule = module_type || req.user.module_type || 'Retail 1';
    const userId = req.user.id;
    const transferAmount = parseFloat(amount) || 0;

    if (transferAmount <= 0) throw new Error('Transfer amount must be greater than zero');
    if (source_account === destination_account) throw new Error('Source and Destination accounts cannot be the same');

    // 1. Insert Transfer Out
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

    // 2. Insert Transfer In
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
};
