const pool = require('../config/db');

async function run() {
  try {
    const tables = [
      'sales',
      'purchases',
      'expenses',
      'salary_payments',
      'rent',
      'investment',
      'other_expenses',
      'bank_accounts'
    ];

    for (const t of tables) {
      try {
        const col = t === 'sales' ? 'sale_type' : 'module_type';
        const res = await pool.query(`SELECT DISTINCT ${col}, COUNT(*) FROM ${t} GROUP BY ${col};`);
        console.log(`DISTINCT IN ${t}:`, res.rows);
      } catch(err) {
        console.log(`Error on table ${t}:`, err.message);
      }
    }
    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
