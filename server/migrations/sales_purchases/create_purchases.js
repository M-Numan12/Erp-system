const pool = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        vehicle_number VARCHAR(100),
        quantity DECIMAL(10,2) DEFAULT 0,
        rate DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        balance_amount DECIMAL(15,2) DEFAULT 0,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        module_type VARCHAR(50),
        user_id INTEGER
      );
    `);
    console.log('Purchases table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating purchases table:', err);
    process.exit(1);
  }
}

migrate();
