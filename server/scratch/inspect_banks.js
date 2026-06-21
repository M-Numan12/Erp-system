const fs = require('fs');

function run() {
  const data = JSON.parse(fs.readFileSync('scratch/live_debug_data.json', 'utf8'));
  console.log("Stored Bank Accounts in Production:");
  data.accounts.forEach(acc => {
    console.log(`ID: ${acc.id} | Name: ${acc.bank_name} | Title: ${acc.account_title} | Number: ${acc.account_number} | Module: ${acc.module_type} | opening_balance: ${acc.opening_balance} | current_balance: ${acc.current_balance}`);
  });
}

run();
