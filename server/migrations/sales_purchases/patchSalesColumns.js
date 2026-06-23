const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function patchSalesColumns() {
  console.log('🚀 Patching missing columns for "sales" table...');

  const queries = [
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_address VARCHAR(255);`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS items TEXT;`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed';`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS labour_group VARCHAR(255);`
  ];

  try {
    for (const sql of queries) {
      await pool.query(sql);
    }
    console.log('🎉 "sales" table successfully patched with all missing columns!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching "sales" table:', err);
    process.exit(1);
  }
}

patchSalesColumns();
