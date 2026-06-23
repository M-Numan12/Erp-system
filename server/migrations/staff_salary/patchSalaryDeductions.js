const pool = require('../config/db');
async function run() {
  console.log('🚀 Creating salary_deductions table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_deductions (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES salary(id) ON DELETE CASCADE,
      amount DECIMAL(15, 2) NOT NULL,
      target_month VARCHAR(100) NOT NULL,
      notes VARCHAR(255),
      is_applied BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Table created successfully.');
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
