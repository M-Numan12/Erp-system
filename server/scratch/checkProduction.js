const axios = require('axios');

async function check() {
  console.log('Checking live production database state...');
  try {
    // Let's check if the server is up and what the auth/login or another public route returns
    // Or check if we can fetch users (should return 401 if unauthenticated, but it proves the server is up)
    const url = 'https://erp-backend-3rf8.onrender.com/api/products';
    const res = await axios.get(url).catch(e => e.response);
    console.log('Status code for /api/products:', res ? res.status : 'No response');
    console.log('Data returned:', res ? res.data : 'None');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
check();
