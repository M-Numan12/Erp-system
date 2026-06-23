const pool = require('../config/db');

async function check() {
  try {
    const r = await pool.query('SELECT * FROM users');
    console.log("USERS_FOUND:", r.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
