const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function patchRentPaymentType() {
  console.log('🚀 Patching payment_type column for "rent" table...');
  try {
    await pool.query(`ALTER TABLE rent ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Cash';`);
    console.log('🎉 "rent" table successfully patched with payment_type!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching "rent" table:', err);
    process.exit(1);
  }
}

patchRentPaymentType();
