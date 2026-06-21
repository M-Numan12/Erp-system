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
    const token = logD.token;
    const h = { "Authorization": `Bearer ${token}` };

    const prodRes = await fetch("https://erp-backend-3rf8.onrender.com/api/products", { headers: h });
    const prods = await prodRes.json();
    console.log("PRODUCTS RETURNED FOR WALI2022:");
    console.table(prods.map(p => ({ id: p.id, name: p.name, brand: p.brand, module_type: p.module_type, user_id: p.user_id })));
  } catch(e) {
    console.error("Error fetching products:", e);
  }
}

run();
