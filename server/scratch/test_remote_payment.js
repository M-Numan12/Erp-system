const axios = require('axios');

async function testRemotePayment() {
  const BASE_URL = 'https://erp-backend-3rf8.onrender.com/api';
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'hassam4288@gmail.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful! Token acquired.');

    console.log('Sending dummy payment request...');
    const paymentRes = await axios.post(
      `${BASE_URL}/sales/payment`,
      {
        customer_id: 1, // Let's use customer id 1 or search for active customer
        amount: 10,
        payment_reference: 'TEST RUN',
        payment_type: 'Cash',
        module_type: 'Wholesale'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Payment successful:', paymentRes.data);
  } catch (err) {
    console.error('Payment request failed:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error message:', err.message);
    }
  }
}

testRemotePayment();
