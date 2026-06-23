const pool = require('../config/db');
(async () => {
  try {
    const exp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' LIMIT 30");
    console.log('EXPENSES COLUMNS:', exp.rows.map(r => r.column_name));
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
