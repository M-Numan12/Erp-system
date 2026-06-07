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
    const h = { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    const updateBody = {
      title: "Transfer from Cash",
      expense_type: "Transfer In",
      category: "Transfer",
      amount: 70.00,
      expense_date: "2026-06-06",
      notes: "Internal transfer.",
      payment_type: "UBL (****4471)",
      vehicle_id: null
    };

    console.log("Updating expense 233...");
    const putRes = await fetch("https://erp-backend-3rf8.onrender.com/api/expenses/233", {
      method: "PUT",
      headers: h,
      body: JSON.stringify(updateBody)
    });
    const putD = await putRes.json();
    console.log("Response:", putD);

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
