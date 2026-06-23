const pool = require('../config/db');
(async () => {
  try {
    const sales = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales' LIMIT 20");
    const purchases = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchases' LIMIT 20");
    console.log('SALES COLUMNS:', sales.rows.map(r => r.column_name));
    console.log('PURCHASES COLUMNS:', purchases.rows.map(r => r.column_name));
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
