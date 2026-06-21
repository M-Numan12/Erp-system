const pool = require('../config/db');

function checkIsCash(acc) {
  if (!acc) return false;
  const bName = (acc.bank_name || '').toLowerCase().trim();
  const accNum = (acc.account_number || '').toLowerCase().trim();
  const accTitle = (acc.account_title || '').toLowerCase().trim();
  return !!(acc.isCash ||
    bName === 'cash' ||
    bName === 'cash account' ||
    accNum === 'cash' ||
    accNum === 'cash account' ||
    accTitle === 'main counter' ||
    accTitle === 'cash' ||
    accTitle === 'cash account');
}

const checkAccountMatch = (cleanMethod, bankAccount) => {
  if (!cleanMethod || !bankAccount) return false;
  const cl = cleanMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();

  if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') {
    return checkIsCash(bankAccount);
  }

  if (checkIsCash(bankAccount)) return false;

  const digits = bankAccount.account_number ? bankAccount.account_number.slice(-4) : '';
  const starDigitsMatch = cl.match(/\*\*\*\*(\d+)/);
  const generalDigitsMatch = cl.match(/\d{4,}/);
  const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[1] : null);

  if (paymentDigits) {
    return digits === paymentDigits;
  }

  const bl = (bankAccount.bank_name || '').toLowerCase().trim();

  if (bl && (cl.includes(bl) || bl.includes(cl))) {
    return true;
  }

  const normCl = cl.replace(/[^a-z0-9]/g, '');
  const normBl = bl.replace(/[^a-z0-9]/g, '');

  if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) {
    return true;
  }

  if (normCl.startsWith('jazz') && normBl.startsWith('jazz')) {
    return true;
  }

  return false;
};

async function run() {
  try {
    const allAccountsRes = await pool.query(
      "SELECT id, bank_name, account_title, account_number, opening_balance, module_type FROM bank_accounts"
    );
    const allAccounts = allAccountsRes.rows;

    const MODULES = ['Wholesale', 'Retail 1', 'Retail 2'];

    for (const mod of MODULES) {
      console.log(`\n=== MODULE: ${mod} ===`);
      const modAccounts = allAccounts.filter(a =>
        (a.module_type || 'Wholesale') === mod && a.module_type !== 'Admin Recipient'
      );

      const cashAcc = modAccounts.find(checkIsCash);
      const cashOpeningBal = cashAcc ? (parseFloat(cashAcc.opening_balance) || 0) : 0;

      // ----------------------------------------------------
      // Query database
      // ----------------------------------------------------
      const [sales, purchases, expenses, salaries, rents, investments, otherExp] = await Promise.all([
        pool.query("SELECT id, paid_amount, payment_type, created_at, sale_type FROM sales WHERE COALESCE(sale_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT p.id, p.paid_amount, p.payment_type, p.delivery_charges, p.fare_payment_type, p.purchase_date, p.product_id, pr.name as product_name FROM purchases p LEFT JOIN products pr ON p.product_id = pr.id WHERE COALESCE(p.module_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT id, amount, payment_type, expense_type, created_at, description, notes FROM expenses WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT id, amount, payment_type, created_at FROM salary_payments WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT id, amount, created_at FROM rent WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT id, amount, created_at, date FROM investment WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]),
        pool.query("SELECT id, amount, payment_method, created_at, date FROM other_expenses WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]),
      ]);

      // ----------------------------------------------------
      // SIMULATE FRONTEND: Accounts.jsx paymentSummary
      // ----------------------------------------------------
      const filteredSales = sales.rows;
      const filteredInvestments = investments.rows;
      const filteredSupplierPayments = purchases.rows.filter(p => parseFloat(p.paid_amount) > 0 && (!p.product_name));
      const filteredGeneralExpenses = expenses.rows;
      const filteredCloseouts = filteredGeneralExpenses.filter(e => e.expense_type === 'Galla Closeout');
      const filteredSalaries = salaries.rows;
      const filteredRents = rents.rows;
      const filteredOtherExpenses = otherExp.rows;

      const rawList = [
        ...filteredSales,
        ...filteredInvestments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash' })),
        ...filteredCloseouts.map(e => ({ ...e, isExpense: true })),
        ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount })),
        ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
          ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash'
        })),
        ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In' && e.expense_type !== 'Sale Return' && e.expense_type !== 'Sale Return Refund').map(e => ({ ...e, isExpense: true })),
        ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type })),
        ...filteredSalaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash' })),
        ...filteredRents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash' })),
        ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method }))
      ].sort((a, b) => new Date(a.created_at || a.expense_date || a.purchase_date || a.date) - new Date(b.created_at || b.expense_date || b.purchase_date || b.date));

      const thresholdIdx = rawList.findIndex(t => Number(t.id) === 218);

      const findKey = (methodName, accounts) => {
        if (!methodName) return 'Cash';
        const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
        if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') return 'Cash';
        const match = accounts.find(a => checkAccountMatch(methodName, a));
        return match ? match.id : 'GHOST';
      };

      const getTransactionAmount = (s) => {
        if (s.isTransportFare) return parseFloat(s.delivery_charges || s.amount || 0);
        if (s.isExpense) return parseFloat(s.paid_amount || s.amount || 0);
        if (s.isIncome) return parseFloat(s.amount || 0);
        return parseFloat(s.paid_amount || 0);
      };

      const frontBalMap = { Cash: cashOpeningBal };
      modAccounts.forEach(a => { frontBalMap[a.id] = parseFloat(a.opening_balance) || 0; });

      rawList.forEach((s, idx) => {
        if (s.payment_type === 'Deduction') return;
        const targetKey = findKey(s.payment_type || 'Cash', modAccounts);
        const amt = getTransactionAmount(s);
        if (frontBalMap[targetKey] === undefined) frontBalMap[targetKey] = 0;

        if (s.isExpense) {
          frontBalMap[targetKey] -= amt;
          const shouldClamp = (thresholdIdx !== -1 && idx < thresholdIdx);
          if (targetKey === 'Cash' && frontBalMap[targetKey] < 0 && shouldClamp) {
            frontBalMap[targetKey] = 0;
          }
        } else {
          frontBalMap[targetKey] += amt;
        }
      });

      // ----------------------------------------------------
      // SIMULATE BACKEND: updateBankAccountsCurrentBalances (UPDATED LOGIC)
      // ----------------------------------------------------
      const backBalMap = { Cash: cashOpeningBal };
      modAccounts.forEach(a => { backBalMap[a.id] = parseFloat(a.opening_balance) || 0; });

      const txns = [];
      sales.rows.forEach(s => txns.push({ id: s.id, type: 'income', pt: s.payment_type, amt: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at) }));
      purchases.rows.filter(p => !p.product_name).forEach(p => txns.push({ id: p.id, type: 'expense', pt: p.payment_type, amt: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date) }));
      expenses.rows.forEach(e => {
        if (e.expense_type === 'Sale Return' || e.expense_type === 'Sale Return Refund') return;
        const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
        txns.push({ id: e.id, type: isIncome ? 'income' : 'expense', pt: e.payment_type, amt: parseFloat(e.amount) || 0, date: new Date(e.created_at) });
      });
      salaries.rows.forEach(s => txns.push({ id: s.id, type: 'expense', pt: s.payment_type || 'Cash', amt: parseFloat(s.amount) || 0, date: new Date(s.created_at) }));
      rents.rows.forEach(r => txns.push({ id: r.id, type: 'expense', pt: 'Cash', amt: parseFloat(r.amount) || 0, date: new Date(r.created_at) }));
      investments.rows.forEach(i => txns.push({ id: i.id, type: 'income', pt: 'Cash', amt: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date) }));
      otherExp.rows.forEach(o => txns.push({ id: o.id, type: 'expense', pt: o.payment_method || 'Cash', amt: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date) }));

      try {
        const transfersRes = await pool.query("SELECT amount, from_account, to_account, created_at FROM bank_transfers WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]);
        transfersRes.rows.forEach(t => {
          txns.push({ type: 'expense', pt: t.from_account, amt: parseFloat(t.amount) || 0, date: new Date(t.created_at) });
          txns.push({ type: 'income', pt: t.to_account, amt: parseFloat(t.amount) || 0, date: new Date(t.created_at) });
        });
      } catch (_) {}

      txns.sort((a, b) => a.date - b.date);

      const backThresholdIdx = txns.findIndex(t => Number(t.id) === 218);

      txns.forEach((t, idx) => {
        const key = findKey(t.pt, modAccounts);
        if (backBalMap[key] === undefined) backBalMap[key] = 0;
        if (t.type === 'income') {
          backBalMap[key] += t.amt;
        } else {
          backBalMap[key] -= t.amt;
          const shouldClamp = mod !== 'Retail 1' || (backThresholdIdx !== -1 && idx < backThresholdIdx);
          if (key === 'Cash' && backBalMap[key] < 0 && shouldClamp) {
            backBalMap[key] = 0;
          }
        }
      });

      // Output comparison
      console.log("Accounts balances comparison:");
      console.log(`  Cash: Frontend = ${frontBalMap['Cash']}, Backend = ${backBalMap['Cash']}`);
      modAccounts.forEach(acc => {
        if (!checkIsCash(acc)) {
          console.log(`  Account ID ${acc.id} (${acc.bank_name}): Frontend = ${frontBalMap[acc.id]}, Backend = ${backBalMap[acc.id]}`);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
