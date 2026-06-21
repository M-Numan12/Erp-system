const fs = require('fs');

function run() {
  const data = JSON.parse(fs.readFileSync('scratch/live_debug_data.json', 'utf8'));
  const p5 = data.purchases.find(p => p.id === 5 || String(p.id) === '5');
  console.log("Purchase ID 5 details:", p5);
  
  // Also print all purchases where product_id is NOT null, but the frontend treats them as supplier payments
  const productsMap = {};
  data.products.forEach(p => { productsMap[p.id] = p.name; });
  
  console.log("\nChecking mismatch between product_id null and product_name null on frontend:");
  data.purchases.forEach(p => {
    const prodName = p.product_id ? productsMap[p.product_id] : null;
    const isSupplierPaymentFront = parseFloat(p.paid_amount) > 0 && !prodName;
    const isSupplierPaymentBack = p.product_id === null;
    if (isSupplierPaymentFront !== isSupplierPaymentBack) {
      console.log(`Mismatch! Purchase ID ${p.id}: front_supplier_pay=${isSupplierPaymentFront}, back_supplier_pay=${isSupplierPaymentBack} | product_id=${p.product_id}, prodName=${prodName}`);
    }
  });
}

run();
