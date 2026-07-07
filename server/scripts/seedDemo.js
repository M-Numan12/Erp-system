const pool = require('../api/config/db');

async function seed() {
  console.log("🌱 Wiping existing data and starting Demo Database Seeding...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Truncate all tables in cascade order
    console.log("🧹 Truncating tables...");
    await client.query(`
      TRUNCATE TABLE 
        sale_items, 
        sales, 
        purchases, 
        expenses, 
        salary_payments, 
        salary_deductions, 
        staff_ledger, 
        staff, 
        customers, 
        products, 
        vehicles, 
        bank_accounts, 
        users 
      RESTART IDENTITY CASCADE
    `);

    // 2. Insert Default Users
    console.log("👤 Creating default demo users...");
    // Passwords are plain text as normalized in authController
    const userRes = await client.query(`
      INSERT INTO users (name, email, password, role) VALUES 
      ('Demo Administrator', 'admin@demo.com', 'demo123', 'admin'),
      ('Wholesale Manager', 'wholesale@demo.com', 'demo123', 'manager'),
      ('Retail Counter A', 'retail1@demo.com', 'demo123', 'manager'),
      ('Retail Counter B', 'retail2@demo.com', 'demo123', 'manager')
      RETURNING id, email, role
    `);
    const adminUser = userRes.rows.find(u => u.role === 'admin');
    const adminId = adminUser ? adminUser.id : 1;

    // Apply module_type updates for managers
    await client.query("UPDATE users SET module_type = 'Wholesale' WHERE email = 'wholesale@demo.com'");
    await client.query("UPDATE users SET module_type = 'Retail 1' WHERE email = 'retail1@demo.com'");
    await client.query("UPDATE users SET module_type = 'Retail 2' WHERE email = 'retail2@demo.com'");

    // 3. Insert Bank Accounts
    console.log("🏦 Creating default cash & bank accounts...");
    await client.query(`
      INSERT INTO bank_accounts (bank_name, account_title, account_number, opening_balance, current_balance, module_type) VALUES 
      ('Cash Account', 'Main Wholesale Counter', 'CASH-W', 50000.00, 50000.00, 'Wholesale'),
      ('Bank Al-Habib', 'Wholesale Business A/C', 'ALH-09827361', 250000.00, 250000.00, 'Wholesale'),
      ('Cash Account', 'Retail Counter 1 Cash', 'CASH-R1', 30000.00, 30000.00, 'Retail 1'),
      ('Habib Bank Limited', 'Retail 1 A/C', 'HBL-12903847', 120000.00, 120000.00, 'Retail 1'),
      ('Cash Account', 'Retail Counter 2 Cash', 'CASH-R2', 20000.00, 20000.00, 'Retail 2'),
      ('Meezan Bank', 'Retail 2 A/C', 'MEZ-88273615', 80000.00, 80000.00, 'Retail 2')
    `);

    // 4. Insert Products
    console.log("📦 Creating products...");
    const prodRes = await client.query(`
      INSERT INTO products (name, category, unit, price, cost_price, stock_quantity, minimum_stock, brand, module_type, user_id, description) VALUES 
      ('Maple Leaf Cement', 'Cement', 'Bag', 1550.00, 1500.00, 800.00, 50.00, 'Maple Leaf', 'Wholesale', $1, 'Premium quality Portland cement'),
      ('Flying Cement', 'Cement', 'Bag', 1520.00, 1480.00, 1200.00, 100.00, 'Flying', 'Wholesale', $1, 'Standard strength building cement'),
      ('Lucky Cement', 'Cement', 'Bag', 1530.00, 1490.00, 650.00, 50.00, 'Lucky', 'Wholesale', $1, 'High resistance sulphate cement'),
      ('Bestway Cement', 'Cement', 'Bag', 1560.00, 1510.00, 400.00, 30.00, 'Bestway', 'Retail 1', $1, 'General construction grade cement')
      RETURNING id, name, module_type
    `, [adminId]);
    const mapleLeaf = prodRes.rows.find(p => p.name === 'Maple Leaf Cement');
    const flyingCement = prodRes.rows.find(p => p.name === 'Flying Cement');

    // 5. Insert Suppliers
    console.log("🚛 Creating suppliers...");
    const supRes = await client.query(`
      INSERT INTO suppliers (name, phone, email, company, address, balance, user_id, module_type) VALUES 
      ('Maple Leaf Cement Factory', '042-111-652-111', 'info@mapleleaf.com.pk', 'Maple Leaf Cement Ltd', 'Daud Khel, Mianwali', 250000.00, $1, 'Wholesale'),
      ('Lucky Cement Factory', '021-35687236', 'sales@lucky-cement.com', 'Lucky Cement Pakistan', 'Pezu, District Lakki Marwat', 0.00, $1, 'Wholesale'),
      ('Bestway Distributors', '051-111-111-222', 'info@bestway.com.pk', 'Bestway Group', 'Hassan Abdal', -50000.00, $1, 'Retail 1')
      RETURNING id, name
    `, [adminId]);
    const mlSupplier = supRes.rows.find(s => s.name === 'Maple Leaf Cement Factory');
    const luckySupplier = supRes.rows.find(s => s.name === 'Lucky Cement Factory');

    // 6. Insert Customers
    console.log("👥 Creating customers...");
    const custRes = await client.query(`
      INSERT INTO customers (name, phone, email, address, balance, user_id, module_type) VALUES 
      ('Bilal Builders Lahore', '0321-4567890', 'bilal.builders@gmail.com', 'Johar Town, Lahore', 45000.00, $1, 'Wholesale'),
      ('Chaudhary Construction', '0300-8889922', 'chaudhary.con@yahoo.com', 'Kot Abdul Malik, Lahore', 0.00, $1, 'Wholesale'),
      ('Siddique Brick Kiln', '0312-3456789', 'siddique.kiln@gmail.com', 'Jaranwala Road, Sheikhupura', -20000.00, $1, 'Retail 1')
      RETURNING id, name
    `, [adminId]);
    const bilalCust = custRes.rows.find(c => c.name === 'Bilal Builders Lahore');
    const chaudharyCust = custRes.rows.find(c => c.name === 'Chaudhary Construction');

    // 7. Insert Vehicles
    console.log("🚚 Creating transport vehicles...");
    const vehRes = await client.query(`
      INSERT INTO vehicles (ownership_type, vehicle_number, driver_name, driver_cnic, driver_phone, total_earnings, user_id, module_type) VALUES 
      ('Personal', 'LET-1234', 'Asif Ali', '35202-0982736-1', '0321-9988771', 5000.00, $1, 'Wholesale'),
      ('External', 'FB-4390', 'Mian Shehroz', '35201-1122334-9', '0333-4455667', 3000.00, $1, 'Wholesale')
      RETURNING id, vehicle_number
    `, [adminId]);
    const personalVeh = vehRes.rows.find(v => v.vehicle_number === 'LET-1234');
    const externalVeh = vehRes.rows.find(v => v.vehicle_number === 'FB-4390');

    // 8. Insert Staff members
    console.log("👔 Creating staff members...");
    const staffRes = await client.query(`
      INSERT INTO staff (name, phone, address, opening_balance, current_balance, user_id, module_type) VALUES 
      ('Waseem Akram', '0300-1122334', 'Kot Lakhpat, Lahore', 0.00, 10000.00, $1, 'Wholesale'),
      ('Mian Naeem', '0322-9988776', 'Shahdara, Lahore', 0.00, -5000.00, $1, 'Wholesale')
      RETURNING id, name
    `, [adminId]);
    const waseemStaff = staffRes.rows.find(s => s.name === 'Waseem Akram');

    // 9. Seed Purchases & Ledger entries
    console.log("🧾 Creating historical purchases & supplier ledger records...");
    // Purchase 1: Stock arrival
    await client.query(`
      INSERT INTO purchases (supplier_id, product_id, vehicle_number, vehicle_id, quantity, rate, total_amount, paid_amount, balance_amount, delivery_charges, fare_payment_type, module_type, user_id, purchase_date) VALUES 
      ($1, $2, $3, $4, 500, 1500.00, 750000.00, 500000.00, 250000.00, 3000.00, 'Paid', 'Wholesale', $5, CURRENT_TIMESTAMP - INTERVAL '5 days')
    `, [mlSupplier.id, mapleLeaf.id, personalVeh.vehicle_number, personalVeh.id, adminId]);

    // Purchase 2: Another Stock arrival
    await client.query(`
      INSERT INTO purchases (supplier_id, product_id, vehicle_number, vehicle_id, quantity, rate, total_amount, paid_amount, balance_amount, delivery_charges, fare_payment_type, module_type, user_id, purchase_date) VALUES 
      ($1, $2, $3, $4, 300, 1480.00, 444000.00, 444000.00, 0.00, 2000.00, 'Paid', 'Wholesale', $5, CURRENT_TIMESTAMP - INTERVAL '3 days')
    `, [luckySupplier.id, flyingCement.id, externalVeh.vehicle_number, externalVeh.id, adminId]);

    // 10. Seed Sales & Sale Items
    console.log("📊 Creating historical sales & customer ledger records...");
    // Sale 1: Credit Sale
    const sale1Res = await client.query(`
      INSERT INTO sales (customer_id, customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_id, vehicle_number, status, created_at) VALUES 
      ($1, $2, '0321-4567890', 'Johar Town, Lahore', 310000.00, 5000.00, 0.00, 305000.00, 260000.00, 45000.00, 'Cash', 'Wholesale', $3, $4, $5, 'Completed', CURRENT_TIMESTAMP - INTERVAL '4 days')
      RETURNING id
    `, [bilalCust.id, bilalCust.name, adminId, personalVeh.id, personalVeh.vehicle_number]);
    
    await client.query(`
      INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES 
      ($1, $2, $3, 200, 1550.00, 310000.00)
    `, [sale1Res.rows[0].id, mapleLeaf.id, mapleLeaf.name]);

    // Sale 2: Fully Paid Cash Sale
    const sale2Res = await client.query(`
      INSERT INTO sales (customer_id, customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_id, vehicle_number, status, created_at) VALUES 
      ($1, $2, '0300-8889922', 'Kot Abdul Malik, Lahore', 152000.00, 0.00, 0.00, 152000.00, 152000.00, 0.00, 'Cash', 'Wholesale', $3, $4, $5, 'Completed', CURRENT_TIMESTAMP - INTERVAL '2 days')
      RETURNING id
    `, [chaudharyCust.id, chaudharyCust.name, adminId, externalVeh.id, externalVeh.vehicle_number]);

    await client.query(`
      INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES 
      ($1, $2, $3, 100, 1520.00, 152000.00)
    `, [sale2Res.rows[0].id, flyingCement.id, flyingCement.name]);

    // 11. Seed Staff Ledger
    console.log("💰 Creating staff ledger entries...");
    // Transaction 1: Advance given
    await client.query(`
      INSERT INTO staff_ledger (staff_id, date, description, debit, credit, balance, payment_method, user_id, module_type) VALUES 
      ($1, CURRENT_DATE - INTERVAL '10 days', 'Advance for house rent', 15000.00, 0.00, 15000.00, 'Cash', $2, 'Wholesale')
    `, [waseemStaff.id, adminId]);

    // Transaction 2: Partial return
    await client.query(`
      INSERT INTO staff_ledger (staff_id, date, description, debit, credit, balance, payment_method, user_id, module_type) VALUES 
      ($1, CURRENT_DATE - INTERVAL '5 days', 'Returned partial advance', 0.00, 5000.00, 10000.00, 'Cash', $2, 'Wholesale')
    `, [waseemStaff.id, adminId]);

    // 12. Seed Expenses
    console.log("💸 Creating expenses...");
    await client.query(`
      INSERT INTO expenses (description, amount, expense_type, category, payment_type, module_type, user_id, expense_date) VALUES 
      ('Office Office Rent June', 30000.00, 'Rent', 'Rent', 'Cash', 'Wholesale', $1, CURRENT_DATE - INTERVAL '6 days'),
      ('Office Electricity Bill June', 15000.00, 'Utility', 'Utilities', 'Cash', 'Wholesale', $1, CURRENT_DATE - INTERVAL '3 days'),
      ('Staff Tea & Lunch Expense', 2500.00, 'Office', 'Refreshments', 'Cash', 'Wholesale', $1, CURRENT_DATE - INTERVAL '1 days')
    `, [adminId]);

    await client.query("COMMIT");
    console.log("🎉 Seeding Demo Data Completed successfully!");
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed with error:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
