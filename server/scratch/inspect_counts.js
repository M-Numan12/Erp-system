const pool = require('../config/db');

async function run() {
  try {
    const tables = [
      'sales', 'purchases', 'expenses', 'salary', 'rent', 'investments', 'other_expenses', 'bank_accounts'
    ];
    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${res.rows[0].count}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
