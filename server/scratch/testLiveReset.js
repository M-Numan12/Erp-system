const axios = require('axios');

async function verify() {
  console.log('Authenticating with live production backend...');
  try {
    const loginRes = await axios.post('https://erp-backend-3rf8.onrender.com/api/auth/login', {
      email: 'hassam4288@gmail.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Authenticated successfully!');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Check products
    const productsRes = await axios.get('https://erp-backend-3rf8.onrender.com/api/products', { headers });
    console.log('Live Product count:', productsRes.data.length);
    
    // Check customers
    const customersRes = await axios.get('https://erp-backend-3rf8.onrender.com/api/customers', { headers });
    console.log('Live Customer count:', customersRes.data.length);
    
    // Check expenses
    const expensesRes = await axios.get('https://erp-backend-3rf8.onrender.com/api/expenses', { headers });
    console.log('Live Expense count:', expensesRes.data.length);

    if (productsRes.data.length === 0 && customersRes.data.length === 0) {
      console.log('🎉 Live database is completely empty and reset to 1!');
    } else {
      console.log('⚠️ Live database still has data. Wait for Render deployment to complete!');
    }
  } catch (err) {
    console.error('Error verifying live data:', err.response ? err.response.data : err.message);
  }
}

verify();
