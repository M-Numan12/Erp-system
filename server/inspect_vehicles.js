const pool = require('./config/db');
async function run() {
  try {
    const res = await pool.query("SELECT * FROM vehicles;");
    console.log("Vehicles in database:", res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
