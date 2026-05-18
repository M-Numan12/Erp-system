const axios = require('axios');

async function diagnosePurchase() {
  const loginUrl = 'https://erp-backend-3rf8.onrender.com/api/auth/login';
  const apiBase = 'https://erp-backend-3rf8.onrender.com/api';
  
  try {
    console.log('🔑 Logging in to production...');
    const loginRes = await axios.post(loginUrl, {
      email: 'datawaley@admin',
      password: 'datawaley494'
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in successfully.');

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Fetch products
    console.log('📡 Fetching products...');
    const prodRes = await axios.get(`${apiBase}/products?type=Wholesale`, { headers });
    const product = prodRes.data[0];
    if (!product) throw new Error('No product found to test with');
    console.log(`👉 Selected Product: ID ${product.id} - ${product.name}`);

    // 2. Fetch suppliers
    console.log('📡 Fetching suppliers...');
    const supRes = await axios.get(`${apiBase}/suppliers?type=Wholesale`, { headers });
    const supplier = supRes.data[0];
    if (!supplier) throw new Error('No supplier found to test with');
    console.log(`👉 Selected Supplier: ID ${supplier.id} - ${supplier.name}`);

    // 3. Fetch vehicles to get a valid vehicle_id
    console.log('📡 Fetching vehicles...');
    const vehRes = await axios.get(`${apiBase}/transport?type=Wholesale`, { headers });
    const vehicle = vehRes.data[0];
    const vehicleId = vehicle ? vehicle.id : '';
    console.log(`👉 Selected Vehicle: ID ${vehicleId} - ${vehicle ? vehicle.vehicle_number : 'None'}`);

    // 4. Attempt Receive Stock with Delivery Charges
    console.log('📡 Sending test purchase POST with fare...');
    const purchaseData = {
      supplier_id: supplier.id,
      product_id: product.id,
      vehicle_number: vehicle ? vehicle.vehicle_number : 'TEST-999',
      vehicle_id: vehicleId,
      quantity: '1',
      rate: '1',
      paid_amount: '0',
      delivery_charges: '100',
      fare_status: 'Pending',
      module_type: 'Wholesale'
    };
    
    const purchaseRes = await axios.post(`${apiBase}/purchases`, purchaseData, { headers });
    console.log('🎉 SUCCESS! Test purchase completed successfully:', purchaseRes.data);

  } catch (err) {
    console.error('❌ Error diagnosing purchase:');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

diagnosePurchase();
