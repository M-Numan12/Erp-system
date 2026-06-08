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
    console.log("Logged in user details:", JSON.stringify(logD.user || logD, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

run();
