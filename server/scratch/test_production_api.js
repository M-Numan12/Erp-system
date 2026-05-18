const axios = require('axios');

async function testLiveApi() {
  const loginUrl = 'https://erp-backend-3rf8.onrender.com/api/auth/login';
  const transportUrl = 'https://erp-backend-3rf8.onrender.com/api/transport';
  
  try {
    console.log('🔑 Attempting to log in to production backend...');
    const loginRes = await axios.post(loginUrl, {
      email: 'datawaley@admin',
      password: 'datawaley494'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully. Token retrieved.');

    console.log('📡 Fetching vehicles from production /api/transport...');
    const transportRes = await axios.get(transportUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('🎉 Response status:', transportRes.status);
    console.log('Response data:', JSON.stringify(transportRes.data, null, 2));

  } catch (err) {
    console.error('❌ Error testing live API:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

testLiveApi();
