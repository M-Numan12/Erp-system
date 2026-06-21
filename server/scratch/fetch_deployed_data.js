const email = "hassam4288@gmail.com";
const password = "admin123";

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
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    const [accRes, salesRes] = await Promise.all([
      fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }),
      fetch("https://erp-backend-3rf8.onrender.com/api/sales?limit=1000", { headers: h })
    ]);

    const accounts = await accRes.json();
    const sales = await salesRes.json();

    console.log("DEPLOYED_ACCOUNTS:", accounts);
    console.log("DEPLOYED_SALES_COUNT:", sales.length);
    console.log("DEPLOYED_SALES_MODULE_TYPES:", [...new Set(sales.map(s => s.sale_type))]);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
