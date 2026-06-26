const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../api/config/db');

async function run() {
  try {
    const res = await pool.query("SELECT * FROM expenses ORDER BY id DESC LIMIT 10");
    console.log("Latest Expenses:");
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
