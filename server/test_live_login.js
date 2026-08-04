const axios = require('axios');

async function testLogin() {
  const url = 'https://erp-backend-3rf8.onrender.com/api/auth/login';
  
  console.log('--- TEST 1: Admin Login with H4277assam.@@ ---');
  try {
    const res = await axios.post(url, {
      email: 'datawaley.support@gmail.com',
      password: 'H4277assam.@@',
      isAdminLogin: true
    });
    console.log('✅ TEST 1 SUCCESS Status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    console.log('❌ TEST 1 FAILED Status:', err.response?.status);
    console.log('Response data:', err.response?.data);
  }

  console.log('\n--- TEST 2: Admin Login with admin@erp.com ---');
  try {
    const res = await axios.post(url, {
      email: 'admin@erp.com',
      password: 'admin123',
      isAdminLogin: true
    });
    console.log('✅ TEST 2 SUCCESS Status:', res.status);
    console.log('Response data:', res.data);
  } catch (err) {
    console.log('❌ TEST 2 FAILED Status:', err.response?.status);
    console.log('Response data:', err.response?.data);
  }
}

testLogin();
