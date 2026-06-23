async function run() {
  const email = "datawaley@admin";
  const password = "datawaley494";
  
  try {
    // Get Token
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const logD = await logRes.json();
    const h = { "Authorization": `Bearer ${logD.token}` };
    
    // Fetch Accounts Data just like Accounts.jsx does
    const [salesR, purR, expR, rentR, otherExpR, investR, bankR] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/sales", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/expenses", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/rent", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/other-expenses", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/investments", { headers: h }).then(r=>r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }).then(r=>r.json())
    ]);

    // Filter to 'Wholesale' just like logic does
    const fsales = salesR.filter(s => (s.sale_type || s.module_type || 'Wholesale') === 'Wholesale');
    const fexp = expR.filter(e => (e.module_type || 'Wholesale') === 'Wholesale');
    const fpur = purR.filter(p => (p.module_type || 'Wholesale') === 'Wholesale' && parseFloat(p.paid_amount) > 0);
    
    const all = [
      ...fsales,
      ...fexp.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment').map(e => ({...e, isExpense:true})),
      ...fexp.filter(e => e.expense_type === 'Admin Payment').map(e => ({...e, isIncome:true, payment_type: e.payment_type})),
      ...fpur.map(p => ({...p, isExpense:true, amount: p.paid_amount}))
    ];
    
    const summary = bankR.reduce((acc, b) => {
      let name = b.bank_name.replace(' Account','');
      if (name.toLowerCase() === 'cash') name = 'Cash';
      acc[name] = parseFloat(b.opening_balance) || 0;
      return acc;
    }, {'Cash':0});
    
    all.forEach(s => {
      const m = s.payment_type || 'Cash';
      let clean = m.replace('Bank - ', '');
      if (clean.toLowerCase() === 'cash' || clean === 'Cash Account') clean = 'Cash';
      const amt = parseFloat(s.paid_amount || s.amount || 0);
      if (!summary[clean]) summary[clean] = 0;
      if (s.isExpense) summary[clean] -= amt;
      else summary[clean] += amt;
    });
    
    console.log("--- REAL PAYMENT SUMMARY FROM PRODUCTION DATA ---");
    console.log(JSON.stringify(summary, null, 2));
    
    console.log("\n--- VISIBLE BANK ACCOUNTS IN PRODUCTION ---");
    console.log(JSON.stringify(bankR.map(b => ({id: b.id, name: b.bank_name, title: b.account_title, bal: b.opening_balance})), null, 2));

  } catch(e) { console.log(e); }
}
run();
