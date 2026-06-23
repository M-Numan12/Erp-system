const pool = require('../config/db');

async function run() {
  try {
    const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("TABLES:", t.rows.map(r => r.table_name));
    const b = await pool.query("SELECT * FROM bank_accounts");
    console.log("ACCOUNTS:", b.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
