const axios = require('axios');

async function run() {
  const accounts = [
    { email: "admin@erp.com", password: "admin123" },
    { email: "admin@erp.com", password: "admin" },
    { email: "retail1@erp.com", password: "shop123" },
    { email: "wholesale@erp.com", password: "shop123" }
  ];
  
  const API = "https://erp-backend-3rf8.onrender.com/api";
  
  let token = null;
  for (const acc of accounts) {
    try {
      console.log(`Trying login for ${acc.email} / ${acc.password}...`);
      const logRes = await axios.post(`${API}/auth/login`, { email: acc.email, password: acc.password });
      token = logRes.data.token;
      console.log(`SUCCESS login for ${acc.email}!`);
      break;
    } catch (err) {
      console.log(`FAILED login for ${acc.email}`);
    }
  }

  if (!token) {
    console.error("All logins failed.");
    return;
  }

  const headers = { "Authorization": `Bearer ${token}` };
  
  try {
    console.log("Fetching all-balances from production...");
    const allBalRes = await axios.get(`${API}/banks/all-balances`, { headers });
    console.log("ALL BALANCES RESPONSE STATUS:", allBalRes.status);
    console.log("ALL BALANCES ROWS:", JSON.stringify(allBalRes.data, null, 2));

    console.log("Fetching banks list from production...");
    const banksRes = await axios.get(`${API}/banks?include_recipients=true`, { headers });
    console.log("BANKS LIST STATUS:", banksRes.status);
    console.log("BANKS LIST ROWS:", JSON.stringify(banksRes.data, null, 2));
    
  } catch (err) {
    console.error("Error fetching from production:", err.response ? err.response.data : err.message);
  }
}

run();
