const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function patchProductsTable() {
  console.log('🚀 Running database patch for "products" table...');

  const queries = [
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER;`
  ];

  try {
    for (const sql of queries) {
      await pool.query(sql);
    }
    console.log('✅ "products" table successfully patched with all missing columns!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching "products" table:', err.message);
    process.exit(1);
  }
}

patchProductsTable();
