const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

async function checkDb() {
  try {
    // 1. Check columns of vehicles table
    const colRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles';
    `);
    console.log('Columns in vehicles table:');
    console.table(colRes.rows);

    // 2. Try the exact query with (is_deleted IS NOT TRUE)
    try {
      const queryRes = await pool.query('SELECT * FROM vehicles WHERE (is_deleted IS NOT TRUE) ORDER BY created_at DESC');
      console.log(`Query "is_deleted IS NOT TRUE" returned ${queryRes.rows.length} rows.`);
      console.table(queryRes.rows.slice(0, 5));
    } catch (e) {
      console.error('ERROR executing query (is_deleted IS NOT TRUE):', e.message);
    }

    // 3. Try standard SELECT count
    const countRes = await pool.query('SELECT COUNT(*) FROM vehicles');
    console.log('Total vehicles count:', countRes.rows[0].count);

    process.exit(0);
  } catch (err) {
    console.error('Fatal database check error:', err.message);
    process.exit(1);
  }
}

checkDb();
