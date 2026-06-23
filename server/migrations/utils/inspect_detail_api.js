async function run() {
  const email = "datawaley@admin";
  const password = "datawaley494";
  const today = new Date().toLocaleDateString('en-CA');

  try {
    const loginRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const auth = await loginRes.json();
    
    const url = `https://erp-backend-3rf8.onrender.com/api/profit/detail/Wholesale?from=${today}&to=${today}`;
    const detRes = await fetch(url, {
      headers: { "Authorization": `Bearer ${auth.token}` }
    });
    const detail = await detRes.json();
    console.log("RAW RESPONSE STATUS:", detRes.status);
    console.log("RAW RESPONSE KEYS:", Object.keys(detail));
    console.log("RAW JSON PAYLOAD:", JSON.stringify(detail, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
