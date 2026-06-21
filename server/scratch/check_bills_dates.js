async function run() {
  try {
    const res = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/debug-raw-data");
    const data = await res.json();
    const sales = data.sales.sort((a,b) => b.id - a.id).slice(0, 15);
    console.log("=== LATEST 15 BILLS ===");
    sales.forEach(s => {
      console.log(`ID: ${s.id} | Name: ${s.customer_name} | Type: ${s.sale_type} | UserID: ${s.user_id} | Created: ${s.created_at}`);
    });
  } catch(e) {
    console.error(e);
  }
}
run();
