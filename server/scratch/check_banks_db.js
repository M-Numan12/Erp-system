const pool = require('../config/db');

async function run() {
  try {
    const res = await pool.query('SELECT id, bank_name, account_title, account_number, opening_balance, module_type, current_balance FROM bank_accounts ORDER BY id ASC');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
