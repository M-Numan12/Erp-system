const logins = [
  { email: "hassam4288@gmail.com", password: "H4277assam.@" },
  { email: "retail2@erp.com", password: "shop456" },
  { email: "retail1@erp.com", password: "shop123" },
  { email: "admin@erp.com", password: "admin123" },
  { email: "admin@erp.com", password: "admin" }
];

async function run() {
  for (const log of logins) {
    try {
      const res = await fetch("https://erp-backend-3rf8.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
      const data = await res.json();
      console.log(`Email: ${log.email}, Password: ${log.password} -> Status: ${res.status}, Role: ${data.user?.role}, Module: ${data.user?.module_type}`);
    } catch(e) {
      console.log(`Email: ${log.email} failed:`, e.message);
    }
  }
}
run();
