const email = "retail2@erp.com";
const password = "shop456";

async function run() {
  try {
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const logD = await logRes.json();
    if (!logRes.ok) {
      console.error("Login failed:", logD);
      return;
    }
    console.log("Logged in successfully. User details:", logD.user ? { role: logD.user.role, module: logD.user.module_type } : logD);
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    const [balRes, bankRes] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h })
    ]);

    const balances = await balRes.json();
    const banks = await bankRes.json();

    console.log("\n--- LIVE BALANCES FOR RETAIL 2 USER ---");
    console.log(JSON.stringify(balances, null, 2));

    console.log("\n--- BANK ACCOUNTS FOR RETAIL 2 USER ---");
    console.log(JSON.stringify(banks.map(b => ({ id: b.id, name: b.bank_name, number: b.account_number, bal: b.opening_balance, module: b.module_type })), null, 2));

  } catch(e) {
    console.error("Error in check_render:", e);
  }
}

run();
