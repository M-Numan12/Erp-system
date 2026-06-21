async function run() {
  const email = "asifiqbaal121@gmail.com";
  const password = "dw1122";
  
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
    console.log("Logged in user:", logD.user);
    const h = { "Authorization": `Bearer ${logD.token}` };
    
    console.log("Fetching GET /api/sales?limit=500 from production...");
    const salesRes = await fetch("https://erp-backend-3rf8.onrender.com/api/sales?limit=500", { headers: h });
    if (salesRes.ok) {
      const sales = await salesRes.json();
      const targetSales = sales.filter(s => s.id === 2212 || s.id === 2213);
      console.log("Target Sales (2212, 2213) in /sales response:", JSON.stringify(targetSales, null, 2));
    } else {
      console.error(`Sales fetch failed: ${salesRes.status}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
