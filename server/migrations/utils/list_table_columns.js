const pool = require('../config/db');
async function run() {
  const tables = ['expenses', 'rent', 'salary', 'other_expenses', 'investments', 'purchases'];
  try {
    for (const table of tables) {
      const info = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1`, 
        [table]
      );
      console.log(`\nTABLE: ${table}`);
      info.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
