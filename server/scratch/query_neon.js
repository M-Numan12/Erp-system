const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_6RkM7qEetYxT@ep-crimson-fog-a5z8uoww.us-east-2.aws.neon.tech/neondb?sslmode=require';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function queryNeon() {
  console.log('🤖 Connecting to live Neon database...');
  try {
    await client.connect();
    console.log('✅ Connected to Neon database successfully!');

    // 1. Fetch user 3
    const userRes = await client.query('SELECT id, name, email, role FROM users WHERE id = 3');
    console.log('\n👤 User 3 details:');
    console.table(userRes.rows);

    // 2. Fetch all devices for user 3
    const devicesRes = await client.query('SELECT * FROM user_devices WHERE user_id = 3');
    console.log('\n📱 All user_devices for User 3:');
    console.table(devicesRes.rows);

    // 3. Fetch recent device action logs/attempts
    const allDevicesRes = await client.query('SELECT id, user_id, ip_address, device_name, is_approved, location, last_login_at FROM user_devices ORDER BY last_login_at DESC LIMIT 10');
    console.log('\n🔍 Top 10 recent devices in DB:');
    console.table(allDevicesRes.rows);

  } catch (err) {
    console.error('❌ Database connection/query failed:', err.message);
  } finally {
    await client.end();
  }
}

queryNeon();
