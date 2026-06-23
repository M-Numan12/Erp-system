const pool = require('../config/db');
(async () => {
  try {
    const result = await pool.query("SELECT id, name, email, role, permissions FROM users WHERE id = 1 OR email LIKE '%hassam%' OR role = 'admin'");
    console.log('CURRENT DB USERS STATUS:', result.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
