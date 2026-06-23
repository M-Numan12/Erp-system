const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function patchMissingColumns() {
  console.log('🚀 Patching missing columns for existing tables on cloud database...');

  const queries = [
    // 1. customers table
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // 2. suppliers table
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(100);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company VARCHAR(255);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // 3. expenses table
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50) DEFAULT 'Office';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Cash';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;`,

    // 4. salary table
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS designation VARCHAR(100);`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS cnic VARCHAR(100);`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS advance_salary DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS joining_date DATE;`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS notes TEXT;`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE salary ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // 5. rent table
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS rent_date DATE DEFAULT CURRENT_DATE;`,
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`
  ];

  try {
    for (const sql of queries) {
      await pool.query(sql);
    }
    console.log('🎉 ALL MISSING COLUMNS SUCCESSFULLY PATCHED ON CLOUD DATABASE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching missing columns:', err.message);
    process.exit(1);
  }
}

patchMissingColumns();
