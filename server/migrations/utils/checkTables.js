const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function checkTables() {
  console.log('🔍 Checking existing tables on live database...');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('📋 Existing Tables:');
    if (result.rows.length === 0) {
      console.log('❌ NO TABLES FOUND (Database is completely empty!)');
    } else {
      result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking tables:', err.message);
    process.exit(1);
  }
}

checkTables();
