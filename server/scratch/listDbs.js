const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres' // connect to postgres database to list other databases
});

async function listDbs() {
  try {
    const res = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Databases on this server:');
    res.rows.forEach(r => console.log(` - ${r.datname}`));
    process.exit(0);
  } catch (err) {
    console.error('Error listing databases:', err.message);
    process.exit(1);
  }
}

listDbs();
