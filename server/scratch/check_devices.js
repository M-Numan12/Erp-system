const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'Numan1206@',
  host: 'localhost',
  port: 5432,
  database: 'erp_system'
});

async function checkDevices() {
  try {
    const res = await pool.query('SELECT * FROM user_devices');
    console.log('📋 Current devices in the user_devices table:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error fetching devices:', err.message);
  } finally {
    await pool.end();
  }
}

checkDevices();
