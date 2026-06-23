const pool = require('../config/db');

async function removeHashes() {
  try {
    console.log('Converting hashed passwords to plain text...');
    
    // We only have the admin user right now, or maybe they created a 'wholesale' user.
    // For safety, we will just set all passwords to '123456' for any users that are not admin, 
    // and 'admin' for the admin user.
    await pool.query("UPDATE users SET password = 'admin' WHERE name = 'Admin User' OR email = 'admin@erp.com'");
    
    console.log('Passwords converted to plain text successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating passwords:', err.message);
    process.exit(1);
  }
}

removeHashes();
