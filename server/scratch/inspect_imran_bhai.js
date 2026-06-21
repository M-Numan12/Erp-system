const fs = require('fs');

function run() {
  const data = JSON.parse(fs.readFileSync('scratch/live_debug_data.json', 'utf8'));
  const productsMap = {};
  data.products.forEach(p => { productsMap[p.id] = p.name; });

  let countDeletedProducts = 0;
  data.purchases.forEach(p => {
    if (p.product_id && !productsMap[p.product_id]) {
      countDeletedProducts++;
      console.log(`Purchase ID: ${p.id} has product_id ${p.product_id} which is NOT in products list (deleted). Paid: ${p.paid_amount}, Date: ${p.purchase_date}`);
    }
  });
  console.log(`Total purchases with deleted products: ${countDeletedProducts}`);
}

run();
