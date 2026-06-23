require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
  console.log('Running migration: creating new tables...\n');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rent (
        id SERIAL PRIMARY KEY,
        property_name VARCHAR(255) NOT NULL,
        landlord_name VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Paid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "rent" created (or already exists).');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id SERIAL PRIMARY KEY,
        investment_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        amount_invested DECIMAL(12, 2) NOT NULL,
        expected_return DECIMAL(12, 2),
        investment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "investments" created (or already exists).');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS other_expenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        expense_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "other_expenses" created (or already exists).');

    console.log('\n✅ Migration complete! All 3 tables are ready.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
