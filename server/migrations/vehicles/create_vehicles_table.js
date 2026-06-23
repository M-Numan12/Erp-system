const pool = require('../config/db');
pool.query(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    ownership_type VARCHAR(50),
    vehicle_number VARCHAR(100),
    driver_name VARCHAR(100),
    driver_cnic VARCHAR(50),
    driver_phone VARCHAR(50),
    total_earnings DECIMAL(15,2) DEFAULT 0,
    user_id INTEGER,
    module_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('Vehicles table created');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
