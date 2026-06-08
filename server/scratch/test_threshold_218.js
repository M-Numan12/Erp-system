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

    const checkIsCash = (acc) => {
      if (!acc) return false;
      return !!(acc.isCash || 
                acc.bank_name?.toLowerCase() === 'cash' || 
                acc.bank_name?.toLowerCase() === 'cash account');
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

    const checkClamping = (thresholdId, isSaleOrPurchase) => {
      let bal = cashOpeningBal;
      const thresholdIdx = rawList.findIndex(t => 
        Number(t.id) === thresholdId && 
        (isSaleOrPurchase === 'purchase' ? (t.supplier_id !== undefined && !t.isTransportFare) : t.isSale)
      );
      
      rawList.forEach((t, idx) => {
        if (t.payment_type === 'Deduction') return;
        const method = t.payment_type || 'Cash';
        const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
        const isCash = cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';
        if (!isCash) return;

        const amt = t.isSale ? (parseFloat(t.paid_amount) || 0) : (parseFloat(t.amount || t.paid_amount || 0));
        if (t.isExpense) {
          bal -= amt;
          const shouldClamp = thresholdIdx !== -1 && idx < thresholdIdx;
          if (bal < 0 && shouldClamp) {
            bal = 0;
          }
        } else {
          bal += amt;
        }
      });
      return { finalBal: bal, thresholdIdx };
    };

    console.log("--- TRYING WITH THRESHOLD 50 (Purchase) ---");
    const res50 = checkClamping(50, 'purchase');
    console.log("Threshold Index:", res50.thresholdIdx);
    console.log("Final balance:", res50.finalBal);

    console.log("--- TRYING WITH THRESHOLD 218 (Sale) ---");
    const res218 = checkClamping(218, 'sale');
    console.log("Threshold Index:", res218.thresholdIdx);
    console.log("Final balance:", res218.finalBal);

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
