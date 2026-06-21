const API = "https://erp-backend-3rf8.onrender.com/api";

async function run() {
  const adminLogins = [
    { email: "hassam4288@gmail.com", password: "H4277assam.@" }
  ];

  let token = null;
  for (const log of adminLogins) {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
      const data = await res.json();
      if (res.ok) {
        token = data.token;
        break;
      }
    } catch(e) {}
  }

  if (!token) {
    console.error("Failed to login as admin");
    return;
  }

  const h = { "Authorization": `Bearer ${token}` };
  try {
    const res = await fetch(`${API}/users`, { headers: h });
    const users = await res.json();
    console.log("ALL USERS IN DB:");
    console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, module_type: u.module_type })));
  } catch(e) {
    console.error("Error fetching users:", e);
  }
}

run();
