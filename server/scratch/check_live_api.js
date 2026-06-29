const axios = require('axios');

const baseUrl = 'https://erp-backend-3rf8.onrender.com/api';

async function testLiveLogin() {
  console.log('🤖 Simulating login against the live Render server...');
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: 'datawaley.support@gmail.com',
      password: 'H4277assam.@@',
      isAdminLogin: true
    });

    console.log('✅ Login Succeeded!');
    const { token, user } = loginRes.data;
    console.log(`👤 Logged in as: [${user.id}] ${user.name} <${user.email}>, Role: ${user.role}`);

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 3. Fetch all debug devices directly
    console.log('\n🔍 Fetching all records from user_devices table...');
    const debugRes = await axios.get(`${baseUrl}/auth/debug-devices`);
    console.table(debugRes.data.map(d => ({
      id: d.id,
      user_id: d.user_id,
      device: d.device_name,
      ip: d.ip_address,
      is_approved: d.is_approved,
      location: d.location,
      last_activity: d.last_login_at
    })));

  } catch (err) {
    if (err.response) {
      console.error('❌ Live API returned error:', err.response.status, err.response.data);
    } else {
      console.error('❌ Failed to connect to live API:', err.message);
    }
  }
}

testLiveLogin();
