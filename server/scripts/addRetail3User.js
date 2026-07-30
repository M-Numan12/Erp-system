const pool = require('./api/config/db');

const perms = JSON.stringify([
  'retail','products','stock','billing','customers','suppliers',
  'transport','expenses','salary','profit','rent','investment','other-expenses'
]);

pool.query(
  'INSERT INTO users (name, email, password, role, module_type, permissions) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING RETURNING id, name, email, role, module_type',
  ['Retail Counter C', 'retail3@demo.com', 'demo123', 'Retail 3', 'Retail 3', perms]
)
.then(r => {
  if (r.rows.length > 0) {
    console.log('✅ Retail 3 user created:', r.rows[0]);
  } else {
    console.log('⏭️  User already exists (retail3@demo.com)');
  }
})
.catch(err => console.error('❌ Error:', err.message))
.finally(() => pool.end());
