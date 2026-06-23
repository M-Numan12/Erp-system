const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function fix() {
  try {
    console.log('Fixing rent table columns...');
    const rentCols = [
      ['property_name', 'VARCHAR(255)'],
      ['landlord_name', 'VARCHAR(255)'],
      ['status', "VARCHAR(50) DEFAULT 'Paid'"],
      ['rent_date', 'DATE DEFAULT CURRENT_DATE'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"]
    ];
    for (const [col, type] of rentCols) {
      await pool.query('ALTER TABLE rent ADD COLUMN IF NOT EXISTS ' + col + ' ' + type + ';');
      console.log('  patched rent.' + col);
    }

    console.log('Fixing salary table columns...');
    const salaryCols = [
      ['amount', 'DECIMAL(12,2) DEFAULT 0'],
      ['advance_salary', 'DECIMAL(12,2) DEFAULT 0'],
      ['payment_date', 'DATE DEFAULT CURRENT_DATE'],
      ['status', "VARCHAR(50) DEFAULT 'Paid'"],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"]
    ];
    for (const [col, type] of salaryCols) {
      await pool.query('ALTER TABLE salary ADD COLUMN IF NOT EXISTS ' + col + ' ' + type + ';');
      console.log('  patched salary.' + col);
    }

    console.log('All done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fix();
