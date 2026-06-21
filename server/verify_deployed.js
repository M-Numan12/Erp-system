async function run() {
  const email = "wali2022@gmail.com";
  const password = "1122334455";
  
  try {
    console.log("Logging into production Render API...");
    const logRes = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    if (!logRes.ok) {
      console.error("Login failed");
      return;
    }
    
    const logD = await logRes.json();
    console.log("Logged in user:", logD.user);
    const h = { "Authorization": `Bearer ${logD.token}` };
    
    console.log("Fetching GET /api/banks?include_recipients=true from production...");
    const banksRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks?include_recipients=true", { headers: h });
    if (banksRes.ok) {
      const banks = await banksRes.json();
      console.log("ALL Banks retrieved:", JSON.stringify(banks, null, 2));
    } else {
      console.error(`Banks fetch failed: ${banksRes.status}`);
    }

    console.log("Fetching live balances for Retail 2 from production...");
    const balRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Retail%202&debug=true", { headers: h });
    if (!balRes.ok) {
      console.error(`Balances fetch failed: ${balRes.status}`);
      return;
    }
    const balances = await balRes.json();
    console.log("Balances for Retail 2:", JSON.stringify(balances, null, 2));

    console.log("Fetching GET /api/banks/balances?type=Retail%201...");
    const balRes1 = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Retail%201&debug=true", { headers: h });
    if (balRes1.ok) {
      console.log("Balances for Retail 1:", JSON.stringify(await balRes1.json(), null, 2));
    }

    console.log("Fetching GET /api/banks/balances?type=Wholesale...");
    const balResW = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balances?type=Wholesale&debug=true", { headers: h });
    if (balResW.ok) {
      console.log("Balances for Wholesale:", JSON.stringify(await balResW.json(), null, 2));
    }

    console.log("Fetching GET /api/banks from production...");
    const banksRes2 = await fetch("https://erp-backend-3rf8.onrender.com/api/banks", { headers: h });
    if (banksRes2.ok) {
      const banks = await banksRes2.json();
      console.log("Banks retrieved:", banks);
    } else {
      console.error(`Banks fetch failed: ${banksRes2.status}`);
    }

    console.log("Fetching GET /api/profit/detail/Retail%202 from production...");
    const profitDetailRes = await fetch("https://erp-backend-3rf8.onrender.com/api/profit/detail/Retail%202", { headers: h });
    if (profitDetailRes.ok) {
      const detail = await profitDetailRes.json();
      const sum = (arr, key) => arr.reduce((s, x) => s + (parseFloat(x[key]) || 0), 0);
      console.log("Profit Detail Stats for Retail 2:");
      console.log("Sales count:", detail.sales?.length, "Sum paid:", sum(detail.sales || [], 'paid_amount'));
      console.log("Expenses count:", detail.expenses?.length, "Sum amount:", sum(detail.expenses || [], 'amount'));
      console.log("Rent count:", detail.rent?.length, "Sum amount:", sum(detail.rent || [], 'amount'));
      console.log("Salary count:", detail.salary?.length, "Sum amount:", sum(detail.salary || [], 'amount'));
      console.log("Other count:", detail.other?.length, "Sum amount:", sum(detail.other || [], 'amount'));
      console.log("Investments count:", detail.investments?.length, "Sum amount:", sum(detail.investments || [], 'amount'));
      console.log("Supply (Purchases) count:", detail.supply?.length, "Sum paid:", sum(detail.supply || [], 'paid_amount'));
    } else {
      console.error(`Profit detail fetch failed: ${profitDetailRes.status}`);
      const errText = await profitDetailRes.text();
      console.error("Error body:", errText);
    }
    
    console.log("Fetching single balance check for HBL RETAIL 2:");
    const singleBalRes = await fetch("https://erp-backend-3rf8.onrender.com/api/banks/balance/HBL%20RETAIL%202?module_type=Retail%202", { headers: h });
    if (singleBalRes.ok) {
      const singleBal = await singleBalRes.json();
      console.log("Single Balance for HBL RETAIL 2:", singleBal);
    } else {
      console.error(`Single balance check failed: ${singleBalRes.status}`);
    }
    
  } catch (err) {
    console.error(err);
  }
}

run();
