const axios = require('axios');

async function testIpApi() {
  const ip = '154.208.33.206';
  console.log(`🤖 Querying location for IP: ${ip} via ip-api.com...`);
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 4000 });
    console.log('✅ Response:', res.data);
    if (res.data && res.data.status === 'success') {
      console.log(`📍 Location Found: ${res.data.city}, ${res.data.regionName}, ${res.data.country}`);
    } else {
      console.error('❌ Failed status:', res.data.message);
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

testIpApi();
