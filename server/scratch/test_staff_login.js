const axios = require('axios');

const baseUrl = 'https://erp-backend-3rf8.onrender.com/api';

async function testStaffLogin() {
  console.log('🤖 Simulating login for staff user...');
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      email: 'mianshehroz@gmail.com',
      password: 'sheri1409'
    });

    console.log('✅ Login Succeeded!', loginRes.data);
  } catch (err) {
    if (err.response) {
      console.error('❌ Live API returned error:', err.response.status, err.response.data);
    } else {
      console.error('❌ Failed to connect to live API:', err.message);
    }
  }
}

testStaffLogin();
