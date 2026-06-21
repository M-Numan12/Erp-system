const url = 'https://erp-backend-3rf8.onrender.com/api/banks/debug-raw-data';

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

async function monitor() {
  console.log("Waiting for Render deployment to complete...");
  let data = null;
  while (true) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        data = await res.json();
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log("Raw data fetched! Simulating calculations...");

  const mod = 'Wholesale';
  const modAccounts = data.accounts.filter(a =>
    (a.module_type || 'Wholesale') === mod && a.module_type !== 'Admin Recipient'
  );
  const cashAcc = modAccounts.find(checkIsCash);
  const cashOpeningBal = cashAcc ? (parseFloat(cashAcc.opening_balance) || 0) : 0;

  // ----------------------------------------------------
  // SIMULATE FRONTEND: Accounts.jsx paymentSummary
  // ----------------------------------------------------
  const productsMap = {};
  data.products.forEach(p => { productsMap[p.id] = p.name; });

  const filteredSupplierPayments = data.purchases.filter(p => {
    const prodName = p.product_id ? productsMap[p.product_id] : null;
    return parseFloat(p.paid_amount) > 0 && (!prodName);
  });

  const rawListFront = [
    ...data.sales,
    ...data.investments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash' })),
    ...data.expenses.filter(e => e.expense_type === 'Galla Closeout').map(e => ({ ...e, isExpense: true })),
    ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount })),
    ...data.expenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In' && e.expense_type !== 'Sale Return' && e.expense_type !== 'Sale Return Refund').map(e => ({ ...e, isExpense: true })),
    ...data.expenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type })),
    ...data.salaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash' })),
    ...data.rents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash' })),
    ...data.otherExp.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method }))
  ].sort((a, b) => new Date(a.created_at || a.expense_date || a.purchase_date || a.date) - new Date(b.created_at || b.expense_date || b.purchase_date || b.date));

  const thresholdIdxFront = rawListFront.findIndex(t => Number(t.id) === 218);

  const getTransactionAmount = (s) => {
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

  let balanceFront = cashOpeningBal;
  const historyFront = [];

  rawListFront.forEach((s, idx) => {
    if (s.payment_type === 'Deduction') return;
    const targetKey = findKey(s.payment_type || 'Cash', modAccounts);
    if (targetKey === 'Cash') {
      const amt = getTransactionAmount(s);
      const prevBal = balanceFront;
      if (s.isExpense) {
        balanceFront -= amt;
        const shouldClamp = (thresholdIdxFront !== -1 && idx < thresholdIdxFront);
        if (balanceFront < 0 && shouldClamp) balanceFront = 0;
      } else {
        balanceFront += amt;
      }
      historyFront.push({ id: s.id, type: s.isExpense ? 'expense' : 'income', desc: s.description || s.title || s.notes || 'Sale/Payment', amount: amt, prevBal, balance: balanceFront, date: new Date(s.created_at || s.expense_date || s.purchase_date || s.date) });
    }
  });

  // ----------------------------------------------------
  // SIMULATE BACKEND: updateBankAccountsCurrentBalances
  // ----------------------------------------------------
  let balanceBack = cashOpeningBal;
  const txns = [];
  data.sales.forEach(s => txns.push({ id: s.id, type: 'income', pt: s.payment_type, amt: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at) }));
  data.purchases.filter(p => {
    const prodName = p.product_id ? productsMap[p.product_id] : null;
    return !prodName;
  }).forEach(p => txns.push({ id: p.id, type: 'expense', pt: p.payment_type, amt: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date) }));
  
  data.expenses.forEach(e => {
    if (e.expense_type === 'Sale Return' || e.expense_type === 'Sale Return Refund') return;
    const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
    txns.push({ id: e.id, type: isIncome ? 'income' : 'expense', pt: e.payment_type, amt: parseFloat(e.amount) || 0, date: new Date(e.created_at) });
  });
  data.salaries.forEach(s => txns.push({ id: s.id, type: 'expense', pt: s.payment_type || 'Cash', amt: parseFloat(s.amount) || 0, date: new Date(s.created_at) }));
  data.rents.forEach(r => txns.push({ id: r.id, type: 'expense', pt: 'Cash', amt: parseFloat(r.amount) || 0, date: new Date(r.created_at) }));
  data.investments.forEach(i => txns.push({ id: i.id, type: 'income', pt: 'Cash', amt: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date) }));
  data.otherExp.forEach(o => txns.push({ id: o.id, type: 'expense', pt: o.payment_method || 'Cash', amt: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date) }));

  try {
    const transfersRes = await pool.query("SELECT amount, from_account, to_account, created_at FROM bank_transfers WHERE COALESCE(module_type, 'Wholesale') = $1", [mod]);
    transfersRes.rows.forEach(t => {
      txns.push({ type: 'expense', pt: t.from_account, amt: parseFloat(t.amount) || 0, date: new Date(t.created_at) });
      txns.push({ type: 'income', pt: t.to_account, amt: parseFloat(t.amount) || 0, date: new Date(t.created_at) });
    });
  } catch (_) {}

  txns.sort((a, b) => a.date - b.date);

  const thresholdIdxBack = txns.findIndex(t => Number(t.id) === 218);
  const historyBack = [];

  txns.forEach((t, idx) => {
    const key = findKey(t.pt, modAccounts);
    if (key === 'Cash') {
      const prevBal = balanceBack;
      if (t.type === 'income') {
        balanceBack += t.amt;
      } else {
        balanceBack -= t.amt;
        const shouldClamp = mod !== 'Retail 1' || (thresholdIdxBack !== -1 && idx < thresholdIdxBack);
        if (balanceBack < 0 && shouldClamp) {
          balanceBack = 0;
        }
      }
      historyBack.push({ id: t.id, type: t.type, amount: t.amt, prevBal, balance: balanceBack, date: t.date });
    }
  });

  console.log(`Frontend simulated balance: ${balanceFront}`);
  console.log(`Backend simulated balance:  ${balanceBack}`);

  // Let's check why they differ (if they do) by comparing the history transaction arrays
  if (balanceFront !== balanceBack) {
    console.log("\n❌ MISMATCH DETECTED! Printing comparison log...");
    console.log(`Front history count: ${historyFront.length}, Back history count: ${historyBack.length}`);
    
    // Find mismatching transactions
    const frontMap = {};
    historyFront.forEach(h => { frontMap[`${h.id}-${h.type}-${h.amount}`]=h; });
    
    const backMap = {};
    historyBack.forEach(h => { backMap[`${h.id}-${h.type}-${h.amount}`]=h; });
    
    console.log("\nTransactions in Frontend but NOT in Backend:");
    historyFront.forEach(h => {
      const key = `${h.id}-${h.type}-${h.amount}`;
      if (!backMap[key]) {
        console.log(`  - ID: ${h.id} | Type: ${h.type} | Desc: ${h.desc} | Amount: ${h.amount} | Date: ${h.date}`);
      }
    });
    
    console.log("\nTransactions in Backend but NOT in Frontend:");
    historyBack.forEach(h => {
      const key = `${h.id}-${h.type}-${h.amount}`;
      if (!frontMap[key]) {
        console.log(`  - ID: ${h.id} | Type: ${h.type} | Amount: ${h.amount} | Date: ${h.date}`);
      }
    });
  } else {
    console.log("\n✅ Perfect match between Frontend and Backend simulation!");
  }
}

monitor();
