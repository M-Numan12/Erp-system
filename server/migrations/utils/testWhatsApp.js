const axios = require('axios');

async function testUltraMsgDirect() {
  console.log('🚀 Triggering direct UltraMsg API Test...');
  const apiUrl = 'https://api.ultramsg.com/instance174172/messages/chat';
  const token = '4722xwbvpu3mdq18';
  const to = '923004269347'; // Admin Phone
  const body = '🔔 *DATA WALEY CEMENT ERP: TEST MESSAGE* \n\nHello! This is a real-time live connection test for your automatic WhatsApp billing system.';

  const params = new URLSearchParams();
  params.append('token', token);
  params.append('to', to);
  params.append('body', body);

  try {
    const res = await axios.post(apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('🎉 ULTRAMSG RESPONSE SUCCESS:', res.data);
  } catch (err) {
    console.error('❌ ULTRAMSG RESPONSE ERROR:', err.response?.data || err.message);
  }
}

testUltraMsgDirect();
