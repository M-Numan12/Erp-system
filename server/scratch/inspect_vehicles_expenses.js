const pool = require('../config/db');

async function run() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public';
    `);
    console.log("=== TABLES IN DATABASE ===");
    console.table(tablesRes.rows);

    for (let row of tablesRes.rows) {
      const cntRes = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}";`);
      console.log(`Table ${row.table_name}: ${cntRes.rows[0].count} rows`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
