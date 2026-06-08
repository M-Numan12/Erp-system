const pool = require('./config/db');

async function test() {
  const client = await pool.connect();
  try {
    // Let's create some dummy vehicles first to be thorough
    await client.query("DELETE FROM vehicles;");
    const v1 = await client.query("INSERT INTO vehicles (ownership_type, vehicle_number, driver_name, total_earnings) VALUES ('Rent', 'V1', 'D1', 0) RETURNING id");
    const v2 = await client.query("INSERT INTO vehicles (ownership_type, vehicle_number, driver_name, total_earnings) VALUES ('Rent', 'V2', 'D2', 0) RETURNING id");
    const v3 = await client.query("INSERT INTO vehicles (ownership_type, vehicle_number, driver_name, total_earnings) VALUES ('Rent', 'V3', 'D3', 0) RETURNING id");
    
    const vehicleIds = [v1.rows[0].id, v2.rows[0].id, v3.rows[0].id];
    console.log("Created vehicles with IDs:", vehicleIds);

    // Let's create a dummy product
    await client.query("DELETE FROM products;");
    const p = await client.query("INSERT INTO products (name, stock_quantity, cost_price, category, unit, price) VALUES ('Test Product', 1000, 10, 'Cement', 'Bag', 15) RETURNING id");
    const productId = p.rows[0].id;

    await client.query('BEGIN');
    
    const customer_name = "Walk-in Customer";
    const customer_phone = "";
    const total_amount = 3000;
    const discount = 0;
    const delivery_charges = 500;
    const net_amount = 3500;
    const paid_amount = 3500;
    const balance_amount = 0;
    const payment_type = "Cash";
    const finalModule = "Wholesale";
    const finalCustomerId = null;
    const vehicle_type = "Rent";
    const labour_group = null;
    const items = [
      { id: productId, name: 'Test Product', qty: 2, price: 1500, subtotal: 3000 }
    ];

    let vehicleNumbers = [];
    if (vehicleIds.length > 0) {
      const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ');
      const vRes = await client.query(`SELECT vehicle_number FROM vehicles WHERE id IN (${placeholders})`, vehicleIds);
      vehicleNumbers = vRes.rows.map(r => r.vehicle_number);
    }
    
    console.log("Vehicle Numbers resolved:", vehicleNumbers);

    const vNumber1 = vehicleNumbers.join(', ') || null;
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    console.log("Inserting sale...");
    const saleResult = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_id, vehicle_id2, vehicle_number, vehicle_number2, vehicle_ids, items, status, labour_group, vehicle_type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING id`,
      [finalCustomerId, customer_name, customer_phone || '', '', total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, finalModule, 1, vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, JSON.stringify(items), 'Completed', labour_group || null, vehicle_type || null]
    );
    const saleId = saleResult.rows[0].id;
    console.log("Sale inserted with ID:", saleId);

    // 2. Inventory check & update
    for (const item of items) {
      const prodId = item.product_id || item.id;
      const prodName = item.product_name || item.name;
      const rate = item.rate || item.price;

      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [saleId, prodId, prodName, item.qty, rate, item.subtotal]
      );

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.qty, prodId]
      );
    }

    // 4. Automatic Transport Earnings Update if vehicle is selected
    if (vehicle_type && vehicleIds.length > 0) {
      const fareAmount = parseFloat(delivery_charges) || 0;
      const farePerVehicle = fareAmount / vehicleIds.length;
      for (const id of vehicleIds) {
        console.log(`Updating earnings for vehicle ID ${id} with amount ${farePerVehicle}`);
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [farePerVehicle, id]
        );
      }
    }

    await client.query('COMMIT');
    console.log("SUCCESS! Transaction committed.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("TRANSACTION FAILED:", e);
  } finally {
    client.release();
    process.exit(0);
  }
}

test();
