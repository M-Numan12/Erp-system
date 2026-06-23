const pool = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        account_title VARCHAR(255),
        account_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Bank Accounts table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating bank_accounts table:', err);
    process.exit(1);
  }
}

migrate();
