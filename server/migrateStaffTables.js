const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Creating staff tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(100),
          address TEXT,
          opening_balance DECIMAL(12, 2) DEFAULT 0,
          current_balance DECIMAL(12, 2) DEFAULT 0,
          user_id INT REFERENCES users(id),
          module_type VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_ledger (
          id SERIAL PRIMARY KEY,
          staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
          date DATE DEFAULT CURRENT_DATE,
          description TEXT NOT NULL,
          debit DECIMAL(12, 2) DEFAULT 0,
          credit DECIMAL(12, 2) DEFAULT 0,
          balance DECIMAL(12, 2) NOT NULL,
          payment_method VARCHAR(100),
          user_id INT REFERENCES users(id),
          module_type VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Staff tables created successfully!');
  } catch (e) {
    console.error('Error creating staff tables:', e);
  } finally {
    process.exit();
  }
}

migrate();
