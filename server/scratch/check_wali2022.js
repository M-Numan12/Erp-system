const email = "wali2022@gmail.com";
const password = "1122334455";

async function run() {
  try {
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const logD = await logRes.json();
    console.log("LOGIN RESPONSE STATUS:", logRes.status);
    console.log("LOGIN RESPONSE DATA:", JSON.stringify(logD, null, 2));
  } catch(e) {
    console.error("Error logging in:", e);
  }
}

run();
