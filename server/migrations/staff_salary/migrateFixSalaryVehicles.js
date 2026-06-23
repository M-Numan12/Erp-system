const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function migrate() {
  console.log('🔧 Running fix migration for salary & vehicles tables...\n');

  try {
    // ============================================================
    // 1. Fix "salary" table — add missing columns
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255),
        designation VARCHAR(255),
        cnic VARCHAR(20),
        amount DECIMAL(12, 2) DEFAULT 0,
        advance_salary DECIMAL(12, 2) DEFAULT 0,
        joining_date DATE,
        payment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Paid',
        notes TEXT,
        user_id INTEGER,
        module_type VARCHAR(50) DEFAULT 'Wholesale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "salary" created/verified.');

    const salaryCols = [
      ['cnic', 'VARCHAR(20)'],
      ['advance_salary', 'DECIMAL(12, 2) DEFAULT 0'],
      ['joining_date', 'DATE'],
      ['payment_date', 'DATE DEFAULT CURRENT_DATE'],
      ['status', "VARCHAR(50) DEFAULT 'Paid'"],
      ['notes', 'TEXT'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"],
    ];
    for (const [col, type] of salaryCols) {
      await pool.query(`ALTER TABLE salary ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ Table "salary" columns patched.');

    // ============================================================
    // 2. Fix "vehicles" table — add missing columns
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        ownership_type VARCHAR(50) DEFAULT 'Personal',
        vehicle_number VARCHAR(100),
        driver_name VARCHAR(255),
        driver_cnic VARCHAR(20),
        driver_phone VARCHAR(20),
        total_earnings DECIMAL(12, 2) DEFAULT 0,
        user_id INTEGER,
        module_type VARCHAR(50) DEFAULT 'Wholesale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "vehicles" created/verified.');

    const vehicleCols = [
      ['ownership_type', "VARCHAR(50) DEFAULT 'Personal'"],
      ['vehicle_number', 'VARCHAR(100)'],
      ['driver_name', 'VARCHAR(255)'],
      ['driver_cnic', 'VARCHAR(20)'],
      ['driver_phone', 'VARCHAR(20)'],
      ['total_earnings', 'DECIMAL(12, 2) DEFAULT 0'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"],
    ];
    for (const [col, type] of vehicleCols) {
      await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ Table "vehicles" columns patched.');

    console.log('\n✅ All salary & vehicle fixes applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
