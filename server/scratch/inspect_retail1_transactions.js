const email = "hassam4288@gmail.com";
const password = "H4277assam.@";

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

    const [salesR, purR, expR, rentR, salR, bankR, otherR, investR] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/sales", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/expenses", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/rent", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/salary", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/other-expenses", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/investments", { headers: h }).then(r => r.json())
    ]);

    console.log("Sales count:", salesR.length);
    console.log("Purchases count:", purR.length);
    console.log("Expenses count:", expR.length);
    console.log("Salaries count:", salR.length);
    console.log("Rents count:", rentR.length);
    console.log("Banks count:", bankR.length);
    console.log("Other count:", otherR.length);
    console.log("Invest count:", investR.length);

    // Let's filter for Retail 1 (since the previous change mentioned clamping in Retail 1)
    const targetModule = "Retail 1";

    const filteredAccounts = bankR.filter(a => (a.module_type || 'Wholesale') === targetModule || a.module_type === 'Admin Recipient');
    const filteredSales = salesR.filter(s => (s.sale_type || s.module_type || 'Wholesale') === targetModule);
    const filteredSupplierPayments = purR.filter(p => (p.module_type || 'Wholesale') === targetModule && parseFloat(p.paid_amount) > 0 && !p.product_name);
    const filteredSupplierFares = purR.filter(p => (p.module_type || 'Wholesale') === targetModule && parseFloat(p.delivery_charges) > 0);
    const filteredGeneralExpenses = expR.filter(e => (e.module_type || 'Wholesale') === targetModule);
    const filteredSalaries = salR.filter(s => (s.module_type || 'Wholesale') === targetModule);
    const filteredRents = rentR.filter(r => (r.module_type || 'Wholesale') === targetModule);
    const filteredInvestments = investR.filter(i => (i.module_type || 'Wholesale') === targetModule);
    const filteredOtherExpenses = otherR.filter(o => (o.module_type || 'Wholesale') === targetModule);

    // Check account match helper
    const checkIsCash = (acc) => {
      if (!acc) return false;
      return !!(acc.isCash || 
                acc.bank_name?.toLowerCase() === 'cash' || 
                acc.bank_name?.toLowerCase() === 'cash account');
    };
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
      const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[0] : null);
      if (paymentDigits) return digits === paymentDigits;
      const bl = (bankAccount.bank_name || '').toLowerCase().trim();
      if (cl.includes(bl) || bl.includes(cl)) return true;
      const normCl = cl.replace(/[^a-z0-9]/g, '');
      const normBl = bl.replace(/[^a-z0-9]/g, '');
      if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) return true;
      if (normCl.startsWith('jazz') && normBl.startsWith('jazz')) return true;
      return false;
    };

    const rawList = [
      ...filteredSales.map(s => ({ ...s, isSale: true, date: new Date(s.created_at || 0) })),
      ...filteredInvestments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash', date: new Date(i.created_at || i.date || 0) })),
      ...filteredGeneralExpenses.filter(e => e.expense_type === 'Galla Closeout').map(e => ({ ...e, isExpense: true, date: new Date(e.created_at || e.expense_date || 0) })),
      ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount, date: new Date(p.created_at || p.purchase_date || 0) })),
      ...filteredSupplierFares.map(p => ({
        ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash',
        date: new Date(p.created_at || p.purchase_date || 0)
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In').map(e => ({ ...e, isExpense: true, date: new Date(e.created_at || e.expense_date || 0) })),
      ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type, date: new Date(e.created_at || e.expense_date || 0) })),
      ...filteredSalaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash', date: new Date(s.created_at || 0) })),
      ...filteredRents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash', date: new Date(r.created_at || 0) })),
      ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method, date: new Date(o.created_at || o.date || 0) }))
    ].sort((a, b) => a.date - b.date);

    const realCashAcc = filteredAccounts.find(b => (b.bank_name.toLowerCase() === 'cash' || b.bank_name.toLowerCase() === 'cash account') && b.module_type !== 'Admin Recipient');
    const cashOpeningBal = realCashAcc ? (parseFloat(realCashAcc.opening_balance) || 0) : 0;

    let balance = cashOpeningBal;
    console.log("Initial Cash Opening Balance:", balance);

    const checkClamping = (thresholdId) => {
      let bal = cashOpeningBal;
      const logs = [];
      const thresholdIdx = rawList.findIndex(t => 
        !t.isTransportFare && 
        t.supplier_id !== undefined && 
        Number(t.id) === thresholdId
      );
      
      rawList.forEach((t, idx) => {
        if (t.payment_type === 'Deduction') return;
        const method = t.payment_type || 'Cash';
        const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
        const isCash = cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';
        if (!isCash) return;

        const amt = t.isSale ? (parseFloat(t.paid_amount) || 0) : (parseFloat(t.amount || t.paid_amount || 0));
        const oldBal = bal;
        if (t.isExpense) {
          bal -= amt;
          const shouldClamp = thresholdIdx !== -1 && idx < thresholdIdx;
          if (bal < 0 && shouldClamp) {
            bal = 0;
          }
        } else {
          bal += amt;
        }
        logs.push({
          idx,
          id: t.id,
          type: t.isSale ? 'Sale' : (t.isExpense ? (t.isTransportFare ? 'Fare' : 'Expense') : 'Income'),
          amt,
          oldBal,
          newBal: bal,
          desc: t.description || t.notes || (t.isSale ? 'Sale' : '')
        });
      });
      return { finalBal: bal, logs, thresholdIdx };
    };

    console.log("--- TRYING WITH THRESHOLD 50 ---");
    const res50 = checkClamping(50);
    console.log("Threshold Index for 50:", res50.thresholdIdx);
    console.log("Final balance with 50:", res50.finalBal);

    console.log("--- TRYING WITH THRESHOLD 59 ---");
    const res59 = checkClamping(59);
    console.log("Threshold Index for 59:", res59.thresholdIdx);
    console.log("Final balance with 59:", res59.finalBal);

    // Let's print out the transaction details around the threshold or where balance goes negative
    console.log("Printing some transactions around purchase ID 50/59:");
    const startIdx = Math.max(0, Math.min(res50.thresholdIdx, res59.thresholdIdx) - 5);
    const endIdx = Math.min(rawList.length, Math.max(res50.thresholdIdx, res59.thresholdIdx) + 5);

    for (let i = startIdx; i < endIdx; i++) {
      const t = rawList[i];
      console.log(`[Idx ${i}] ID: ${t.id}, Type: ${t.supplier_id !== undefined ? 'Purchase' : 'Other'}, Date: ${t.date.toISOString().split('T')[0]}, Details: ${t.description || t.notes || ''}`);
    }

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
