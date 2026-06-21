const fs = require('fs');

async function run() {
  const url = 'https://erp-backend-3rf8.onrender.com/api/banks/debug-raw-data';
  console.log("Fetching live debug data from", url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    const data = await res.json();
    fs.writeFileSync('scratch/live_debug_data.json', JSON.stringify(data, null, 2));
    console.log("Success! Saved live data to scratch/live_debug_data.json");
  } catch (err) {
    console.error("Error fetching live data:", err);
  }
}

run();
