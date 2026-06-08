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

    const salesR = await fetch("https://erp-backend-3rf8.onrender.com/api/sales", { headers: h }).then(r => r.json());
    const s218 = salesR.find(s => s.id === 218);
    console.log("Sale 218:", JSON.stringify(s218, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

run();
