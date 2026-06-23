const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function patchFinalRemainingColumns() {
  console.log('🚀 Patching final remaining columns on cloud database...');

  const queries = [
    `ALTER TABLE labours ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE labour_work_history ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Cash';`
  ];

  try {
    for (const sql of queries) {
      await pool.query(sql);
    }
    console.log('🎉 ALL REMAINING COLUMNS SUCCESSFULLY PATCHED ON CLOUD DATABASE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching final columns:', err.message);
    process.exit(1);
  }
}

patchFinalRemainingColumns();
