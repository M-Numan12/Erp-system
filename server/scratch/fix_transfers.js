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

    // 1. Update Expense 230 (Transfer Out) -> should be UBL (****4471)
    const body230 = {
      title: "Transfer to Cash",
      expense_type: "Transfer Out",
      category: "Transfer",
      amount: 70.00,
      expense_date: "2026-06-05",
      notes: "Internal transfer.",
      payment_type: "UBL (****4471)",
      vehicle_id: null
    };
    console.log("Updating expense 230 to UBL (****4471)...");
    const res230 = await fetch("https://erp-backend-3rf8.onrender.com/api/expenses/230", {
      method: "PUT",
      headers: h,
      body: JSON.stringify(body230)
    });
    const data230 = await res230.json();
    console.log("Response 230:", data230);

    // 2. Update Expense 233 (Transfer In) -> should be UBL (****5044)
    const body233 = {
      title: "Transfer from Cash",
      expense_type: "Transfer In",
      category: "Transfer",
      amount: 70.00,
      expense_date: "2026-06-05",
      notes: "Internal transfer.",
      payment_type: "UBL (****5044)",
      vehicle_id: null
    };
    console.log("Updating expense 233 to UBL (****5044)...");
    const res233 = await fetch("https://erp-backend-3rf8.onrender.com/api/expenses/233", {
      method: "PUT",
      headers: h,
      body: JSON.stringify(body233)
    });
    const data233 = await res233.json();
    console.log("Response 233:", data233);

  } catch(e) {
    console.error("Error:", e);
  }
}

run();
