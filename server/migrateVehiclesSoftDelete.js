const pool = require('./config/db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    `);
    console.log('Vehicles table migrated with is_deleted column successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error migrating vehicles table:', err);
    process.exit(1);
  }
}

migrate();
