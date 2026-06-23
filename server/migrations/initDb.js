const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function initDb() {
  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing database.sql...');
    await pool.query(sqlString);
    console.log('Tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err.message);
    process.exit(1);
  }
}

initDb();
