require('dotenv').config();
const pool = require('../config/db');

const users = [
  {
    name: 'Admin',
    email: 'admin@erp.com',
    password: 'admin123',
    role: 'admin',
    permissions: JSON.stringify(['wholesale','retail','products','stock','billing','customers','suppliers','transport','expenses','salary','profit','rent','investment','other-expenses','users'])
  },
  {
    name: 'Wholesale Shop',
    email: 'wholesale@erp.com',
    password: 'shop123',
    role: 'user',
    permissions: JSON.stringify(['wholesale','products','stock','billing','customers','suppliers','transport','expenses','salary','profit','rent','investment','other-expenses'])
  },
  {
    name: 'Retail Shop 1',
    email: 'retail1@erp.com',
    password: 'shop123',
    role: 'user',
    permissions: JSON.stringify(['retail','products','stock','billing','customers','suppliers','transport','expenses','salary','profit','rent','investment','other-expenses'])
  },
  {
    name: 'Retail Shop 2',
    email: 'retail2@erp.com',
    password: 'shop456',
    role: 'user',
    permissions: JSON.stringify(['retail','products','stock','billing','customers','suppliers','transport','expenses','salary','profit','rent','investment','other-expenses'])
  }
];

async function seed() {
  console.log('🌱 Seeding users...\n');
  try {
    for (const u of users) {
      const exists = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (exists.rows.length > 0) {
        console.log(`⏭️  Skipped (already exists): ${u.email}`);
        continue;
      }
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role, permissions) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role',
        [u.name, u.email, u.password, u.role, u.permissions]
      );
      const row = result.rows[0];
      console.log(`✅ Created: [${row.id}] ${row.name} <${row.email}> role=${row.role}`);
    }
    console.log('\n✅ Seeding complete!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin        → admin@erp.com      / admin123');
    console.log('  Wholesale    → wholesale@erp.com  / shop123');
    console.log('  Retail 1     → retail1@erp.com    / shop123');
    console.log('  Retail 2     → retail2@erp.com    / shop456');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
