const email = "hassam4288@gmail.com";
const password = "H4277assam.@";

function checkIsCash(acc) {
  if (!acc) return false;
  return !!(acc.isCash || 
            acc.bank_name?.toLowerCase() === 'cash' || 
            acc.bank_name?.toLowerCase() === 'cash account');
}

function checkAccountMatch(cleanMethod, bankAccount) {
  if (!cleanMethod || !bankAccount) return false;
  const cl = cleanMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
  
  if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') {
    return checkIsCash(bankAccount);
  }
  
  if (checkIsCash(bankAccount)) return false;

  const digits = bankAccount.account_number ? bankAccount.account_number.slice(-4) : '';
  const starDigitsMatch = cl.match(/\*\*\*\*(\d+)/);
  const generalDigitsMatch = cl.match(/\d{4,}/);
  const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[0] : null);

  if (paymentDigits) {
    return digits === paymentDigits;
  }

  const bl = (bankAccount.bank_name || '').toLowerCase().trim();
  
  if (cl.includes(bl) || bl.includes(cl)) {
    return true;
  }

  const normCl = cl.replace(/[^a-z0-9]/g, '');
  const normBl = bl.replace(/[^a-z0-9]/g, '');
  
  if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) {
    return true;
  }

  return false;
}

function getTransactionAmount(t) {
  return parseFloat(t.amount || t.net_amount || t.paid_amount || 0);
}

async function run() {
  try {
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const logD = await logRes.json();
    if (!logRes.ok) {
      console.error("Login failed:", logD);
      return;
    }
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    // Fetch all entities for manual calculation
    const [accRes, salesRes, invRes, supRes, salRes, rentRes, otherRes, expRes] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/sales?limit=10000", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/investments", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/salary", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/rent", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/other-expenses", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/expenses", { headers: h })
    ]);

    const accounts = await accRes.json();
    const sales = await salesRes.json();
    const investments = await invRes.json();
    const supplierPayments = await supRes.json();
    const salaries = await salRes.json();
    const rents = await rentRes.json();
    const otherExpenses = await otherRes.json();
    const generalExpenses = await expRes.json();

    const targetModule = "Wholesale";
    const filteredAccounts = [
      ...accounts.filter(a => (a.module_type || 'Wholesale') === targetModule && a.module_type !== 'Admin Recipient'),
      ...accounts.filter(a => a.module_type === 'Admin Recipient')
    ];
    const filteredSales = sales.filter(s => (s.sale_type || s.module_type || 'Wholesale') === targetModule);
    const filteredInvestments = investments.filter(i => (i.module_type || 'Wholesale') === targetModule);
    const filteredSupplierPayments = supplierPayments.filter(p => (p.module_type || 'Wholesale') === targetModule);
    const filteredSalaries = salaries.filter(s => (s.module_type || 'Wholesale') === targetModule);
    const filteredRents = rents.filter(r => (r.module_type || 'Wholesale') === targetModule);
    const filteredOtherExpenses = otherExpenses.filter(o => (o.module_type || 'Wholesale') === targetModule);
    const filteredGeneralExpenses = generalExpenses.filter(e => (e.module_type || 'Wholesale') === targetModule);
    const filteredCloseouts = filteredGeneralExpenses.filter(e => e.expense_type === 'Galla Closeout');

    // Frontend List
    const frontendTxList = [
      ...filteredSales.map(s => ({ source: 'sales', type: 'income', payment_type: s.payment_type, amount: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at) })), 
      ...filteredInvestments.map(i => ({ source: 'investment', type: 'income', payment_type: 'Cash', amount: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date) })),
      ...filteredCloseouts.map(e => ({ source: 'closeout', type: 'expense', payment_type: e.payment_type || 'Cash', amount: parseFloat(e.amount) || 0, date: new Date(e.created_at) })),
      ...filteredSupplierPayments.map(p => ({ source: 'purchase', type: 'expense', payment_type: p.payment_type, amount: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date) })),
      ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
        source: 'purchase_fare', type: 'expense', payment_type: p.fare_payment_type || 'Cash', amount: parseFloat(p.delivery_charges) || 0, date: new Date(p.purchase_date)
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In').map(e => ({ source: 'expense', type: 'expense', payment_type: e.payment_type, amount: parseFloat(e.amount) || 0, date: new Date(e.created_at) })),
      ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ source: 'expense_in', type: 'income', payment_type: e.payment_type, amount: parseFloat(e.amount) || 0, date: new Date(e.created_at) })),
      ...filteredSalaries.map(s => ({ source: 'salary', type: 'expense', payment_type: 'Cash', amount: parseFloat(s.amount) || 0, date: new Date(s.created_at) })),
      ...filteredRents.map(r => ({ source: 'rent', type: 'expense', payment_type: 'Cash', amount: parseFloat(r.amount) || 0, date: new Date(r.created_at) })),
      ...filteredOtherExpenses.map(o => ({ source: 'other_expense', type: 'expense', payment_type: o.payment_method, amount: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date) }))
    ];

    // Backend List (simulated from pool queries in balances endpoint)
    // We simulate using the same arrays
    const backendTxList = [];
    filteredSales.forEach(s => backendTxList.push({ source: 'sales', type: 'income', payment_type: s.payment_type, amount: parseFloat(s.paid_amount) || 0, date: new Date(s.created_at) }));
    filteredSupplierPayments.forEach(p => backendTxList.push({ source: 'purchase', type: 'expense', payment_type: p.payment_type, amount: parseFloat(p.paid_amount) || 0, date: new Date(p.purchase_date) }));
    filteredGeneralExpenses.forEach(e => {
        const isIncome = e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In';
        backendTxList.push({ source: isIncome ? 'expense_in' : 'expense', type: isIncome ? 'income' : 'expense', payment_type: e.payment_type, amount: parseFloat(e.amount) || 0, date: new Date(e.created_at) });
    });
    filteredSalaries.forEach(s => backendTxList.push({ source: 'salary', type: 'expense', payment_type: s.payment_type || 'Cash', amount: parseFloat(s.amount) || 0, date: new Date(s.created_at) }));
    filteredRents.forEach(r => backendTxList.push({ source: 'rent', type: 'expense', payment_type: 'Cash', amount: parseFloat(r.amount) || 0, date: new Date(r.created_at) }));
    filteredInvestments.forEach(i => backendTxList.push({ source: 'investment', type: 'income', payment_type: 'Cash', amount: parseFloat(i.amount) || 0, date: new Date(i.created_at || i.date) }));
    filteredOtherExpenses.forEach(o => backendTxList.push({ source: 'other_expense', type: 'expense', payment_type: o.payment_method || 'Cash', amount: parseFloat(o.amount) || 0, date: new Date(o.created_at || o.date) }));

    const findBalanceKey = (methodName) => {
      if (!methodName) return 'Cash';
      const cl = methodName.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
      const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
      if (isCashPT) return 'Cash';

      const match = filteredAccounts.find(acc => checkAccountMatch(methodName, acc));
      if (match) {
        const digits = match.account_number ? match.account_number.slice(-4) : '';
        return `${match.bank_name} ${digits ? `(****${digits})` : ''}`;
      }
      return methodName.replace(/^bank\s*-\s*/i, '').trim();
    };

    // Calculate sum of cash income/expenses for both
    let frontCashInc = 0, frontCashExp = 0;
    frontendTxList.forEach(t => {
      if (t.payment_type === 'Deduction') return;
      const key = findBalanceKey(t.payment_type);
      if (key === 'Cash') {
        if (t.type === 'income') frontCashInc += t.amount;
        else frontCashExp += t.amount;
      }
    });

    let backCashInc = 0, backCashExp = 0;
    backendTxList.forEach(t => {
      const key = findBalanceKey(t.payment_type);
      if (key === 'Cash') {
        if (t.type === 'income') backCashInc += t.amount;
        else backCashExp += t.amount;
      }
    });

    console.log(`Frontend Cash Income:  Rs. ${frontCashInc.toLocaleString()}`);
    console.log(`Frontend Cash Expense: Rs. ${frontCashExp.toLocaleString()}`);
    console.log(`Backend Cash Income:   Rs. ${backCashInc.toLocaleString()}`);
    console.log(`Backend Cash Expense:  Rs. ${backCashExp.toLocaleString()}`);

    // Print count of transactions
    console.log(`Frontend Tx Count: ${frontendTxList.length}`);
    console.log(`Backend Tx Count:  ${backendTxList.length}`);

    // Let's check if there is a difference in the sales array length or contents!
    console.log(`Sales count in local array: ${filteredSales.length}`);

  } catch(e) {
    console.error(e);
  }
}

run();
