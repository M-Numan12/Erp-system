async function run() {
  const url = "https://erp-backend-3rf8.onrender.com/api/banks/debug-users";
  console.log("Fetching migration script from:", url);
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log("MIGRATION RESPONSE:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Failed: Status ${res.status}`);
    }
  } catch(e) {
    console.log(`Error: ${e.message}`);
  }
}
run();
