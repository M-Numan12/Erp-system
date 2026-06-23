const pool = require('../config/db');
(async () => {
  try {
    const tables = ['purchases', 'products', 'suppliers', 'vehicles', 'expenses'];
    for (const t of tables) {
        console.log(`--- ${t.toUpperCase()} ---`);
        const res = await pool.query(`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${t}'
        `);
        res.rows.forEach(r => {
            console.log(`${r.column_name}: ${r.is_nullable}, ${r.data_type}`);
        });
    }
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
