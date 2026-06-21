const fs = require('fs');

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

function run() {
  const data = JSON.parse(fs.readFileSync('scratch/live_debug_data.json', 'utf8'));
  const productsMap = {};
  data.products.forEach(p => { productsMap[p.id] = p.name; });

  const MODULES = ['Wholesale', 'Retail 1', 'Retail 2'];

  for (const targetModule of MODULES) {
    console.log(`\n=== MODULE: ${targetModule} ===`);

    const modAccounts = data.accounts.filter(a =>
      (a.module_type || 'Wholesale') === targetModule && a.module_type !== 'Admin Recipient'
    );

    const cashAcc = modAccounts.find(checkIsCash);
    const cashOpeningBal = cashAcc ? (parseFloat(cashAcc.opening_balance) || 0) : 0;

    // Filter data for this module
    const filteredSales = data.sales.filter(s => (s.sale_type || s.module_type || 'Wholesale') === targetModule);
    const filteredSupplierPayments = data.purchases.filter(p => {
      const prodName = p.product_id ? productsMap[p.product_id] : null;
      return (p.module_type || 'Wholesale') === targetModule && parseFloat(p.paid_amount) > 0 && (!prodName);
    });
    const filteredInvestments = data.investments.filter(i => (i.module_type || 'Wholesale') === targetModule);
    const filteredGeneralExpenses = data.expenses.filter(e => (e.module_type || 'Wholesale') === targetModule);
    const filteredCloseouts = filteredGeneralExpenses.filter(e => e.expense_type === 'Galla Closeout');
    const filteredSalaries = data.salaries.filter(s => (s.module_type || 'Wholesale') === targetModule);
    const filteredRents = data.rents.filter(r => (r.module_type || 'Wholesale') === targetModule);
    const filteredOtherExpenses = data.otherExp.filter(o => (o.module_type || 'Wholesale') === targetModule);

    // ----------------------------------------------------
    // SIMULATE FRONTEND: Accounts.jsx paymentSummary
    // ----------------------------------------------------
    const rawListFront = [
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

    const thresholdIdxFront = rawListFront.findIndex(t => Number(t.id) === 218);

    const getTransactionAmount = (s) => {
      if (s.isTransportFare) return parseFloat(s.delivery_charges || s.amount || 0);
      if (s.isExpense) return parseFloat(s.paid_amount || s.amount || 0);
      if (s.isIncome) return parseFloat(s.amount || 0);
      return parseFloat(s.paid_amount || 0);
    };

    const findKey = (methodName, accounts) => {
      if (!methodName) return 'Cash';
      const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
      if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') return 'Cash';
      const match = accounts.find(a => checkAccountMatch(methodName, a));
      return match ? match.id : 'GHOST';
    };

    const frontBalMap = { Cash: cashOpeningBal };
    modAccounts.forEach(a => { frontBalMap[a.id] = parseFloat(a.opening_balance) || 0; });

    rawListFront.forEach((s, idx) => {
      if (s.payment_type === 'Deduction') return;
      const targetKey = findKey(s.payment_type || 'Cash', modAccounts);
      const amt = getTransactionAmount(s);
      if (frontBalMap[targetKey] === undefined) frontBalMap[targetKey] = 0;

      if (s.isExpense) {
        frontBalMap[targetKey] -= amt;
        const shouldClamp = (thresholdIdxFront !== -1 && idx < thresholdIdxFront);
        if (targetKey === 'Cash' && frontBalMap[targetKey] < 0 && shouldClamp) {
          frontBalMap[targetKey] = 0;
        }
      } else {
        frontBalMap[targetKey] += amt;
      }
    });

    // ----------------------------------------------------
    // SIMULATE CURRENT DB: stored current_balance
    // ----------------------------------------------------
    console.log("Account balances comparison:");
    console.log(`  Cash: Frontend = ${frontBalMap['Cash']}, DB Stored = ${cashAcc ? cashAcc.current_balance : 'N/A'}`);
    modAccounts.forEach(acc => {
      if (!checkIsCash(acc)) {
        console.log(`  Account ID ${acc.id} (${acc.bank_name}): Frontend = ${frontBalMap[acc.id]}, DB Stored = ${acc.current_balance}`);
      }
    });
  }
}

run();
