const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../api/config/db');

async function countRows() {
  console.log('📊 Analyzing local database row counts...');
  const tables = [
    'users', 'products', 'suppliers', 'stock', 'customers', 'bills', 'bill_items', 
    'transport', 'expenses', 'salary', 'rent', 'investments', 'other_expenses',
    'bank_accounts', 'labours', 'labour_work_history', 'vehicles', 'sales', 
    'sale_items', 'purchases', 'stock_logs'
  ];

  try {
    for (const table of tables) {
      try {
        const res = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`  - ${table.padEnd(20)}: ${res.rows[0].count} rows`);
      } catch (err) {
        console.log(`  - ${table.padEnd(20)}: ❌ Table missing or error (${err.message})`);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing row count query:', err.message);
    process.exit(1);
  }
}

countRows();
