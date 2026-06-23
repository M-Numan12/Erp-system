const pool = require('../config/db');
pool.query(`
  CREATE TABLE IF NOT EXISTS stock_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(100),
    quantity DECIMAL(10,2),
    log_type VARCHAR(20) DEFAULT 'IN',
    module_type VARCHAR(50),
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('Stock Logs table created');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
