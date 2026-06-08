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

    const purR = await fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }).then(r => r.json());
    console.log("Total purchases in ledger/all:", purR.length);
    
    // Find purchases with module_type = 'Retail 1'
    const retail1Purchases = purR.filter(p => p.module_type === 'Retail 1');
    console.log("Retail 1 purchases count:", retail1Purchases.length);
    
    // Sort them by date and ID
    const sorted = retail1Purchases.sort((a, b) => a.id - b.id);
    sorted.forEach(p => {
      console.log(`Purchase ID: ${p.id}, Supplier: ${p.supplier_name}, Paid: ${p.paid_amount}, Date: ${p.purchase_date}`);
    });

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
