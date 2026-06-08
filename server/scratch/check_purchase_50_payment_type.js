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
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    const purR = await fetch("https://erp-backend-3rf8.onrender.com/api/purchases/ledger/all", { headers: h }).then(r => r.json());
    const p50 = purR.find(p => p.id === 50);
    console.log("Purchase 50:", JSON.stringify(p50, null, 2));

    const p59 = purR.find(p => p.id === 59);
    console.log("Purchase 59:", JSON.stringify(p59, null, 2));

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
