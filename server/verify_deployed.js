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
    
    console.log("Fetching temporary fix endpoint from production...");
    const fixRes = await fetch("https://erp-backend-3rf8.onrender.com/api/sales/fix-temp-2212-2213", { headers: h });
    if (fixRes.ok) {
      const fixData = await fixRes.json();
      console.log("Fix Result:", JSON.stringify(fixData, null, 2));
    } else {
      console.error(`Fix failed: ${fixRes.status}`);
      const errText = await fixRes.text();
      console.error("Body:", errText);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
