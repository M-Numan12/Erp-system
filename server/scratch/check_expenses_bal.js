// Full production check - login + check expenses cash balance + bank accounts
const https = require('https');

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'erp-backend-3rf8.onrender.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'erp-backend-3rf8.onrender.com',
      path,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data.substring(0, 500) }); } });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== Logging in as Hassam ===');
  const login = await apiPost('/api/auth/login', { email: 'hassam4288@gmail.com', password: 'H4277assam.@' });
  const token = login.token;
  const user = login.user;
  console.log(`User: ${user?.name}, Role: ${user?.role}, Module: ${user?.module_type || 'null (admin)'}`);
  
  // Determine which module expenses page would show
  const activeTab = user?.module_type || 'Wholesale';
  console.log(`\n=== Active Tab for Expenses: "${activeTab}" ===`);
  
  // Check /banks/balances for that module
  console.log('\n=== Fetching /banks/balances for', activeTab, '===');
  const balances = await apiGet(`/api/banks/balances?type=${encodeURIComponent(activeTab)}`, token);
  console.log('Balances response:', JSON.stringify(balances, null, 2));
  
  // Show what cash balance would appear in the form
  const cashBal = balances['Cash'] || 0;
  console.log(`\n=== Cash Balance that would appear in Expense form: Rs. ${cashBal.toLocaleString()} ===`);
  
  // Check bank accounts available
  console.log('\n=== Bank Accounts for this user ===');
  const banks = await apiGet('/api/banks', token);
  if (Array.isArray(banks)) {
    banks.forEach(b => {
      console.log(`  - ${b.bank_name} | module: ${b.module_type} | opening: ${b.opening_balance}`);
    });
  }
  
  // Check recent expenses
  console.log('\n=== Recent Expenses ===');
  const expenses = await apiGet(`/api/expenses?type=${encodeURIComponent(activeTab)}`, token);
  if (Array.isArray(expenses)) {
    console.log(`Total expenses for ${activeTab}: ${expenses.length}`);
    expenses.slice(0, 5).forEach(e => {
      console.log(`  - ${e.expense_date} | ${e.expense_type} | Rs.${e.amount} | payment: ${e.payment_type}`);
    });
  }
  
  // Check for all modules' balances (as admin can switch tabs)
  console.log('\n=== Balances for ALL Modules ===');
  for (const mod of ['Wholesale', 'Retail 1', 'Retail 2']) {
    const b = await apiGet(`/api/banks/balances?type=${encodeURIComponent(mod)}`, token);
    console.log(`${mod}: Cash = Rs. ${(b['Cash'] || 0).toLocaleString()}`);
  }
}

run().catch(console.error);
