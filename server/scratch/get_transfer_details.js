const email = "hassam4288@gmail.com";
const password = "H4277assam.@";

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
    console.log("Logged in successfully.");
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    console.log("Fetching live balances...");
    const balRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Retail+1", { headers: h });
    const balances = await balRes.json();
    console.log("Balances:", JSON.stringify(balances, null, 2));

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
