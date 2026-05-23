const pool = require('../config/db');

async function inspect() {
  try {
    const dbNameRes = await pool.query('SELECT current_database(), current_user');
    console.log('Connected DB:', dbNameRes.rows[0]);

    // Check count of some tables
    const tables = ['users', 'products', 'sales', 'bills', 'expenses'];
    for (const t of tables) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM ${t}`);
        console.log(`Table '${t}' count:`, countRes.rows[0].count);
        if (countRes.rows[0].count > 0) {
          const sample = await pool.query(`SELECT * FROM ${t} LIMIT 2`);
          console.log(`Sample from ${t}:`, sample.rows);
        }
      } catch (e) {
        console.log(`Table '${t}' error:`, e.message);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspect();
