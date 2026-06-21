const API = "https://erp-backend-3rf8.onrender.com/api";

async function loginAndGetData(email, password) {
  try {
    const logRes = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const logD = await logRes.json();
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    const [prodRes, salesRes, banksRes, custsRes] = await Promise.all([
      fetch(`${API}/products`, { headers: h }).then(r => r.json()),
      fetch(`${API}/sales`, { headers: h }).then(r => r.json()),
      fetch(`${API}/banks`, { headers: h }).then(r => r.json()),
      fetch(`${API}/customers`, { headers: h }).then(r => r.json())
    ]);

    return {
      email,
      prods: Array.isArray(prodRes) ? prodRes : [],
      sales: Array.isArray(salesRes) ? salesRes : [],
      banks: Array.isArray(banksRes) ? banksRes : [],
      customers: Array.isArray(custsRes) ? custsRes : []
    };
  } catch(e) {
    console.error("Error for", email, e);
    return null;
  }
}

async function run() {
  const r1 = await loginAndGetData("retail1@erp.com", "shop123");
  const r2 = await loginAndGetData("wali2022@gmail.com", "1122334455");

  if (!r1 || !r2) return;

  console.log(`\n=== COMPARISON FOR RETAIL 1 (${r1.email}) vs RETAIL 2 (${r2.email}) ===`);

  console.log(`\n--- Products ---`);
  console.log(`Retail 1 count: ${r1.prods.length}, Retail 2 count: ${r2.prods.length}`);
  console.log("Retail 1 Prods:", r1.prods.map(p => `#${p.id} ${p.name} (${p.module_type})`).slice(0, 5));
  console.log("Retail 2 Prods:", r2.prods.map(p => `#${p.id} ${p.name} (${p.module_type})`).slice(0, 5));

  console.log(`\n--- Customers ---`);
  console.log(`Retail 1 count: ${r1.customers.length}, Retail 2 count: ${r2.customers.length}`);
  console.log("Retail 1 Customers:", r1.customers.map(c => `#${c.id} ${c.name} (${c.module_type})`).slice(0, 5));
  console.log("Retail 2 Customers:", r2.customers.map(c => `#${c.id} ${c.name} (${c.module_type})`).slice(0, 5));

  console.log(`\n--- Sales (Bills) ---`);
  console.log(`Retail 1 count: ${r1.sales.length}, Retail 2 count: ${r2.sales.length}`);
  console.log("Retail 1 Sales:", r1.sales.map(s => `#${s.id} ${s.customer_name} ${s.total_amount} (${s.sale_type})`).slice(0, 5));
  console.log("Retail 2 Sales:", r2.sales.map(s => `#${s.id} ${s.customer_name} ${s.total_amount} (${s.sale_type})`).slice(0, 5));

  console.log(`\n--- Bank Accounts ---`);
  console.log(`Retail 1 count: ${r1.banks.length}, Retail 2 count: ${r2.banks.length}`);
  console.log("Retail 1 Banks:", r1.banks.map(b => `#${b.id} ${b.bank_name} (${b.module_type})`));
  console.log("Retail 2 Banks:", r2.banks.map(b => `#${b.id} ${b.bank_name} (${b.module_type})`));
}

run();
