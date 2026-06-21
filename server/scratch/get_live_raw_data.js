async function run() {
  try {
    const res = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/debug-raw-data");
    const data = await res.json();
    console.log("=== LIVE DATABASE RAW INFO ===");
    console.log("BANK ACCOUNTS IN DB:", data.accounts.map(a => `${a.id}: ${a.bank_name} (${a.module_type})` + (a.user_id ? ` user_id:${a.user_id}` : '')));
    
    // Group products by module_type
    const productsByModule = {};
    data.products.forEach(p => {
      const mt = p.module_type || 'null';
      if (!productsByModule[mt]) productsByModule[mt] = [];
      productsByModule[mt].push(p.name);
    });
    console.log("\nPRODUCTS BY MODULE:");
    for (const mt in productsByModule) {
      console.log(`  - ${mt}: ${productsByModule[mt].length} products (e.g. ${productsByModule[mt].slice(0, 3).join(', ')})`);
    }

    // Check if there are sales or customers
    console.log(`\nTOTAL SALES RETRIEVED (Wholesale): ${data.sales.length}`);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
