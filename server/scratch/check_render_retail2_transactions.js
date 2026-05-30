const email = "retail2@erp.com";
const password = "shop456";

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

    const [salesR, purR, expR, rentR, salR, bankR] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/sales", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/expenses", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/rent", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/salary", { headers: h }).then(r => r.json()),
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }).then(r => r.json())
    ]);

    console.log("--- RAW SALES ---");
    console.log(JSON.stringify(salesR.map(s => ({ id: s.id, paid: s.paid_amount, payment_type: s.payment_type, date: s.sale_date })), null, 2));

    console.log("--- RAW PURCHASES ---");
    console.log(JSON.stringify(purR.map(p => ({ id: p.id, paid: p.paid_amount, payment_type: p.payment_type, date: p.purchase_date })), null, 2));

    console.log("--- RAW EXPENSES ---");
    console.log(JSON.stringify(expR.map(e => ({ id: e.id, amt: e.amount, type: e.expense_type, payment_type: e.payment_type, desc: e.description, date: e.expense_date })), null, 2));

    console.log("--- RAW SALARIES ---");
    console.log(JSON.stringify(salR, null, 2));

    console.log("--- RAW RENTS ---");
    console.log(JSON.stringify(rentR, null, 2));

    console.log("--- RAW BANKS ---");
    console.log(JSON.stringify(bankR, null, 2));

  } catch(e) {
    console.error("Error in check_render_retail2_transactions:", e);
  }
}

run();
