const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function migrate() {
  console.log('🚀 Running enhanced ERP migration...\n');

  try {
    // 1. Sales (Billing System)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        customer_name VARCHAR(255),
        total_amount DECIMAL(12, 2) DEFAULT 0,
        discount DECIMAL(12, 2) DEFAULT 0,
        delivery_charges DECIMAL(12, 2) DEFAULT 0,
        net_amount DECIMAL(12, 2) DEFAULT 0,
        paid_amount DECIMAL(12, 2) DEFAULT 0,
        balance_amount DECIMAL(12, 2) DEFAULT 0,
        payment_type VARCHAR(50) DEFAULT 'Cash',
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER,
        product_name VARCHAR(255),
        qty DECIMAL(12, 2),
        rate DECIMAL(12, 2),
        subtotal DECIMAL(12, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Billing tables (sales, sale_items) ready.');

    // 2. Enhance Existing Tables
    const tableUpdates = {
      salary: [
        ['cnic', 'VARCHAR(20)'],
        ['advance_salary', 'DECIMAL(12, 2) DEFAULT 0'],
        ['joining_date', 'DATE']
      ],
      transport: [
        ['vehicle_type', 'VARCHAR(50)'],
        ['trips', 'INTEGER DEFAULT 1'],
        ['pending_payment', 'DECIMAL(12, 2) DEFAULT 0'],
        ['ownership_type', "VARCHAR(50) DEFAULT 'Personal'"]
      ],
      expenses: [
        ['expense_type', "VARCHAR(50) DEFAULT 'Office'"]
      ],
      products: [
        ['retail_stock', 'DECIMAL(12, 2) DEFAULT 0'],
        ['wholesale_stock', 'DECIMAL(12, 2) DEFAULT 0']
      ],
      sales: [
        ['vehicle_id', 'INTEGER'],
        ['vehicle_number', 'VARCHAR(50)'],
        ['sale_type', "VARCHAR(50) DEFAULT 'Retail'"]
      ]
    };

    for (const [tableName, columns] of Object.entries(tableUpdates)) {
      for (const [col, type] of columns) {
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col} ${type};`);
      }
      console.log(`✅ Table "${tableName}" enhanced with new fields.`);
    }

    console.log('\n✅ All tables synchronized for advanced features!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
