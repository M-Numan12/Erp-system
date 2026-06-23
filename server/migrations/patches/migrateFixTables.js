const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function migrate() {
  console.log('🔧 Running fix migration for investment, other_expenses, rent tables...\n');

  try {
    // ============================================================
    // 1. Fix the "investment" table
    //    Old schema had: investment_name, amount_invested, etc.
    //    New backend expects: title, investor, amount, date, notes, user_id, module_type
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS investment (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        investor VARCHAR(255),
        amount DECIMAL(12, 2) DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        user_id INTEGER,
        module_type VARCHAR(50) DEFAULT 'Wholesale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "investment" created/verified.');

    // Add missing columns to "investment" table (in case old version exists)
    const investmentCols = [
      ['title', 'VARCHAR(255)'],
      ['investor', 'VARCHAR(255)'],
      ['amount', 'DECIMAL(12, 2) DEFAULT 0'],
      ['date', 'DATE DEFAULT CURRENT_DATE'],
      ['notes', 'TEXT'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"],
    ];
    for (const [col, type] of investmentCols) {
      await pool.query(`ALTER TABLE investment ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ Table "investment" columns patched.');

    // ============================================================
    // 2. Fix "other_expenses" table
    //    Old schema used "expense_date"; backend uses "date"
    //    Also missing: user_id, module_type, payment_method
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS other_expenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        category VARCHAR(100),
        amount DECIMAL(10, 2) DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        notes TEXT,
        user_id INTEGER,
        module_type VARCHAR(50) DEFAULT 'Wholesale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "other_expenses" created/verified.');

    const otherExpCols = [
      ['title', 'VARCHAR(255)'],
      ['category', 'VARCHAR(100)'],
      ['amount', 'DECIMAL(10, 2) DEFAULT 0'],
      ['date', 'DATE DEFAULT CURRENT_DATE'],
      ['payment_method', "VARCHAR(50) DEFAULT 'Cash'"],
      ['notes', 'TEXT'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"],
    ];
    for (const [col, type] of otherExpCols) {
      await pool.query(`ALTER TABLE other_expenses ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ Table "other_expenses" columns patched.');

    // ============================================================
    // 3. Fix "rent" table
    //    Old schema used "payment_date"; backend uses "rent_date"
    //    Also missing: user_id, module_type
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rent (
        id SERIAL PRIMARY KEY,
        property_name VARCHAR(255),
        landlord_name VARCHAR(255),
        amount DECIMAL(10, 2) DEFAULT 0,
        rent_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Paid',
        notes TEXT,
        user_id INTEGER,
        module_type VARCHAR(50) DEFAULT 'Wholesale',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "rent" created/verified.');

    const rentCols = [
      ['rent_date', 'DATE DEFAULT CURRENT_DATE'],
      ['user_id', 'INTEGER'],
      ['module_type', "VARCHAR(50) DEFAULT 'Wholesale'"],
    ];
    for (const [col, type] of rentCols) {
      await pool.query(`ALTER TABLE rent ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ Table "rent" columns patched.');

    console.log('\n✅ All fixes applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
