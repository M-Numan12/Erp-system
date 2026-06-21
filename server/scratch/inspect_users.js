const { Pool } = require('pg');
const NEON_URL = 'postgresql://neondb_owner:npg_6RkM7qEetYxT@ep-crimson-fog-a5z8uoww.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
});

async function inspectUsers() {
  try {
    const res = await pool.query('SELECT id, name, email, role, module_type FROM users');
    console.log('--- USERS IN DATABASE ---');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

inspectUsers();

