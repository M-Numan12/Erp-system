const pool = require('../config/db');
(async () => {
  try {
    const tables = ['purchases', 'products', 'suppliers', 'vehicles', 'expenses'];
    for (const t of tables) {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}'`);
        console.log(`${t.toUpperCase()} COLUMNS:`, res.rows.map(r => r.column_name).join(', '));
    }
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
