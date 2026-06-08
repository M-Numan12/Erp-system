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

    const bankR = await fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h }).then(r => r.json());
    console.log("All bank accounts in database:");
    bankR.forEach(b => {
      console.log(`Bank ID: ${b.id}, Name: ${b.bank_name}, Title: ${b.account_title}, Number: ${b.account_number}, Module Type: ${b.module_type}, Opening Balance: ${b.opening_balance}`);
    });
  } catch(e) {
    console.error("Error:", e);
  }
}

run();
