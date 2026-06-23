async function run() {
  const email = "datawaley@admin";
  const password = "datawaley494";
  try {
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/users/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const logD = await logRes.json();
    const h = { "Authorization": `Bearer ${logD.token}` };
    const salesR = await fetch("https://erp-backend-3rf8.onrender.com/api/sales", { headers: h }).then(r=>r.json());
    const bankR = await fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }).then(r=>r.json());
    
    console.log("--- RAW SALES API SAMPLE ---");
    console.log(Array.isArray(salesR) ? "Array of " + salesR.length : typeof salesR);
    if (!Array.isArray(salesR)) console.log(salesR);
    
    const parsedSales = Array.isArray(salesR) ? salesR : (salesR.sales || []);
    const fSales = parsedSales.filter(s => (s.sale_type || 'Wholesale') === 'Wholesale');
    
    const sum = {};
    fSales.forEach(s => {
      const m = (s.payment_type || 'Cash').replace('Bank - ', '');
      sum[m] = (sum[m] || 0) + parseFloat(s.paid_amount || 0);
    });
    console.log("\n--- AGGREGATED SALES PAYMENT TYPES ---");
    console.log(sum);
    
    console.log("\n--- RAW BANK LIST ---");
    console.log(bankR.map(b => b.bank_name));

  } catch(e) { console.log(e); }
}
run();
