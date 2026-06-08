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

    // Fetch live balances from backend
    const [balWholesaleRes, balRetailRes] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Wholesale", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Retail%201", { headers: h })
    ]);
    const liveBalWholesale = await balWholesaleRes.json();
    const liveBalRetail = await balRetailRes.json();

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

    for (const targetModule of ["Wholesale", "Retail 1"]) {
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

      // Reconstruct paymentSummary logic (Frontend)
      const rawList = [
        ...filteredSales, 
        ...filteredInvestments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash' })),
        ...filteredCloseouts.map(e => ({ ...e, isExpense: true })),
        ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount })),
        ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
          ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash'
        })),
        ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In').map(e => ({ ...e, isExpense: true })),
        ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type })),
        ...filteredSalaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash' })),
        ...filteredRents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash' })),
        ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method }))
      ].sort((a, b) => new Date(a.created_at || a.expense_date || a.purchase_date || a.date) - new Date(b.created_at || b.expense_date || b.purchase_date || b.date));

      const realCashAcc = filteredAccounts.find(b => (b.bank_name.toLowerCase() === 'cash' || b.bank_name.toLowerCase() === 'cash account') && b.module_type !== 'Admin Recipient');
      const cashOpeningBal = realCashAcc ? (parseFloat(realCashAcc.opening_balance) || 0) : 0;

      const initial = filteredAccounts.filter(b => b.module_type !== 'Admin Recipient').reduce((acc, b) => {
        acc[b.id] = parseFloat(b.opening_balance) || 0;
        return acc;
      }, { 'Cash': cashOpeningBal });

      const res = rawList.reduce((acc, s) => {
        if (s.payment_type === 'Deduction') return acc;
        const method = s.payment_type || 'Cash';
        
        let targetKey = 'UNMATCHED_GHOST';
        const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
        const isCash = cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';
        
        if (isCash) {
           targetKey = 'Cash';
        } else {
           const match = filteredAccounts.find(b => checkAccountMatch(method, b));
           if (match) targetKey = match.id;
        }
        
        const amt = getTransactionAmount(s);
        if (!acc[targetKey]) acc[targetKey] = 0;
        
        if (s.isExpense) {
           acc[targetKey] -= amt;
           if (targetKey === 'Cash' && acc[targetKey] < 0 && targetModule !== 'Retail 1') acc[targetKey] = 0; 
        } else {
           acc[targetKey] += amt;
        }
        return acc;
      }, initial);

      const frontendCash = res['Cash'] || 0;
      const backendCash = (targetModule === "Wholesale" ? liveBalWholesale["Cash"] : liveBalRetail["Cash"]) || 0;
      
      // Calculate total delivery charges for purchases paid in Cash
      const totalCashPurchaseDeliveryCharges = filteredSupplierPayments
        .filter(p => {
          const fareAmt = parseFloat(p.delivery_charges) || 0;
          if (fareAmt <= 0) return false;
          const method = p.fare_payment_type || 'Cash';
          const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
          const isCash = cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';
          return isCash;
        })
        .reduce((sum, p) => sum + parseFloat(p.delivery_charges), 0);

      console.log(`\n--- MODULE: ${targetModule} ---`);
      console.log(`Frontend Cash Balance (Accounts Page): Rs. ${frontendCash.toLocaleString()}`);
      console.log(`Backend Cash Balance (Daily Expense):   Rs. ${backendCash.toLocaleString()}`);
      console.log(`Difference (Frontend - Backend):       Rs. ${(frontendCash - backendCash).toLocaleString()}`);
      console.log(`Total Cash Purchase Delivery Charges:  Rs. ${totalCashPurchaseDeliveryCharges.toLocaleString()}`);
      
      // Let's print details of cash purchase delivery charges
      console.log(`Cash Purchase Delivery Charges Details:`);
      filteredSupplierPayments
        .filter(p => {
          const fareAmt = parseFloat(p.delivery_charges) || 0;
          if (fareAmt <= 0) return false;
          const method = p.fare_payment_type || 'Cash';
          const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
          return cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';
        })
        .forEach(p => {
          console.log(`  Purchase ID ${p.id}: Date: ${p.purchase_date}, Fare: Rs. ${parseFloat(p.delivery_charges).toLocaleString()}, Method: ${p.fare_payment_type || 'Cash'}`);
        });
    }
  } catch(e) {
    console.error("Run error:", e);
  }
}

run();
