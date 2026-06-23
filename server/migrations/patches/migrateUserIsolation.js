require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
  console.log('🔄 Running user isolation migration...\n');
  try {
    // Products
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ products.user_id');

    // Stock – also add text columns so FKs are not required
    await pool.query(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await pool.query(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);`);
    console.log('✅ stock.user_id + product_name + supplier_name');

    // Customers
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ customers.user_id');

    // Suppliers
    await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ suppliers.user_id');

    // Bills – add text/JSONB helpers
    await pool.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await pool.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';`);
    await pool.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash';`);
    await pool.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Paid';`);
    console.log('✅ bills.user_id + helpers');

    // Transport
    await pool.query(`ALTER TABLE transport ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await pool.query(`ALTER TABLE transport ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE transport ADD COLUMN IF NOT EXISTS transport_date DATE DEFAULT CURRENT_DATE;`);
    console.log('✅ transport.user_id');

    // Expenses
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100);`);
    console.log('✅ expenses.user_id');

    // Salary
    await pool.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ salary.user_id');

    // Rent
    await pool.query(`ALTER TABLE rent ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ rent.user_id');

    // Investments
    await pool.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ investments.user_id');

    // Other Expenses
    await pool.query(`ALTER TABLE other_expenses ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
    console.log('✅ other_expenses.user_id');

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
