const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6RkM7qEetYxT@ep-crimson-fog-a5z8uoww.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    const res = await pool.query('SELECT id, name, email, password, role, module_type FROM users ORDER BY id ASC');
    console.log('=== USERS IN LIVE DATABASE ===');
    res.rows.forEach(u => {
      console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Pass: "${u.password}" | Role: ${u.role} | Module: ${u.module_type}`);
    });
  } catch (err) {
    console.error('Error fetching users:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
