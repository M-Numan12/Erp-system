const pool = require('../config/db');

async function addPermissionsColumn() {
  try {
    console.log('Adding permissions column to users table...');
    // We store permissions as a JSON array. Default is a string representation of an empty array '[]'
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
    `);

    // Give the admin user all permissions as a safety measure
    const allModules = JSON.stringify([
      "wholesale", "retail", "users", "products", "stock", "billing", 
      "customers", "suppliers", "transport", "expenses", "salary", "profit"
    ]);

    await pool.query(`
      UPDATE users 
      SET permissions = $1 
      WHERE email = 'admin@erp.com';
    `, [allModules]);

    console.log('Permissions column added and admin updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding permissions column:', err.message);
    process.exit(1);
  }
}

addPermissionsColumn();
