const axios = require('axios');

async function checkSite() {
  try {
    const res = await axios.get('https://www.datawaleycement.com/portal-admin', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    });
    console.log('=== SITE RESPONSE HEADERS ===');
    console.log(res.headers);
    console.log('\n=== HTML SNIPPET ===');
    console.log(res.data.substring(0, 1000));
  } catch (err) {
    console.error('Error fetching site:', err);
  }
}

checkSite();
