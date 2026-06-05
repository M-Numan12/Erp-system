const axios = require('axios');

async function testLocalPayment() {
  const BASE_URL = 'http://localhost:5000/api';
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'hassam4288@gmail.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful! Token acquired.');

    // Fetch customers first to get a valid customer ID
    const customersRes = await axios.get(`${BASE_URL}/customers?type=Wholesale`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (customersRes.data.length === 0) {
      console.log('No customers found. Cannot make a payment.');
      return;
    }

    const testCustomer = customersRes.data[0];
    console.log(`Using customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

    console.log('Sending dummy payment request...');
    const paymentRes = await axios.post(
      `${BASE_URL}/sales/payment`,
      {
        customer_id: testCustomer.id,
        amount: 10,
        payment_reference: 'TEST LOCAL RUN',
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

testLocalPayment();
