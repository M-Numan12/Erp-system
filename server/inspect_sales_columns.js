const pool = require('./config/db');
async function run() {
  try {
    const info = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'sales'`
    );
    console.log(`\nTABLE: sales`);
    info.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
