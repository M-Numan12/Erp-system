async function run() {
  const email = "hassam4288@gmail.com";
  const password = "H4277assam.@";
  
  try {
    console.log("Logging into production Render API...");
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    if (!logRes.ok) {
      console.error("Login failed");
      return;
    }
    
    const logD = await logRes.json();
    const h = { "Authorization": `Bearer ${logD.token}` };
    
    console.log("Fetching live balances for Retail 1 from production...");
    const balRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Retail%201", { headers: h });
    if (!balRes.ok) {
      console.error(`Balances fetch failed: ${balRes.status}`);
      return;
    }
    
    const balances = await balRes.json();
    console.log("Balances for Retail 1:", balances);
    
    console.log("Fetching single balance check for JAZZ.C:");
    const singleBalRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balance/JAZZ.C?module_type=Retail%201", { headers: h });
    if (singleBalRes.ok) {
      const singleBal = await singleBalRes.json();
      console.log("Single Balance for JAZZ.C:", singleBal);
    } else {
      console.error(`Single balance check failed: ${singleBalRes.status}`);
    }
    
  } catch (err) {
    console.error(err);
  }
}

run();
