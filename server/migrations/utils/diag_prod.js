async function run() {
  const email = "datawaley@admin";
  const password = "datawaley494";
  
  try {
    const loginRes = await fetch("https://erp-backend-3rf8.onrender.com/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Logged in. Token acquired.");

    const headers = { "Authorization": `Bearer ${token}` };
    
    // Fetch Wholesale balances
    const balRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Wholesale", { headers });
    const balances = await balRes.json();
    console.log("\n--- PRODUCTION WHOLESALE BALANCES ---");
    console.log(JSON.stringify(balances, null, 2));
    
    // Fetch Banks list
    const banksRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers });
    const banks = await banksRes.json();
    console.log("\n--- PRODUCTION BANKS LIST ---");
    console.log(banks.map(b => `${b.id}: ${b.bank_name} (${b.module_type})`));

  } catch (err) {
    console.error("Error querying production API:", err);
  }
}
run();
