const fs = require('fs');

function run() {
  const data = JSON.parse(fs.readFileSync('scratch/live_debug_data.json', 'utf8'));
  console.log("Unique employees in salary_payments (live data):");
  const unique = {};
  data.salaries.forEach(p => {
    const key = `${p.staff_id} - ${p.employee_name}`;
    if (!unique[key]) {
      unique[key] = { count: 1, sample: p };
    } else {
      unique[key].count++;
    }
  });
  
  Object.entries(unique).forEach(([key, info]) => {
    console.log(`  ${key} | Count: ${info.count} | Sample payment_type: ${info.sample.payment_type}`);
  });
}

run();
