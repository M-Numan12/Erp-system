const pool = require('../config/db');

async function run() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS salary_payments (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER,
        employee_name VARCHAR(255),
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        payment_type VARCHAR(100) NOT NULL DEFAULT 'Cash',
        transaction_type VARCHAR(50) NOT NULL DEFAULT 'Salary',
        month VARCHAR(50),
        payment_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        module_type VARCHAR(100),
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await pool.query(createTableQuery);
    console.log("Table salary_payments created successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration Failed:", err);
    process.exit(1);
  }
}

run();
