const pool = require('../config/db');

async function testBalances() {
  try {
    const targetModule = 'Wholesale';

    // 1. Fetch bank accounts opening balances
    let accountsQ = 'SELECT bank_name, opening_balance FROM bank_accounts';
    let params = [];
      accountsQ += " WHERE COALESCE(module_type, 'Wholesale') = $1 OR module_type = 'Admin Recipient'";
      params.push(targetModule);
    
    console.log("Running Query 1...");
    const accountsRes = await pool.query(accountsQ, params);
    
    const balances = { 'Cash': 0 };
    accountsRes.rows.forEach(acc => {
      let name = acc.bank_name.replace(' Account', '');
      if (name.toLowerCase() === 'cash') name = 'Cash';
      balances[name] = parseFloat(acc.opening_balance) || 0;
    });

    console.log("Running Query 2 (Sales)...");
    // 2. Fetch sales
    let salesQ = "SELECT net_amount, paid_amount, payment_type FROM sales WHERE COALESCE(sale_type, 'Wholesale') = $1";
    const salesRes = await pool.query(salesQ, [targetModule]);

    console.log("Running Query 3 (Purchases)...");
    // 3. Fetch purchases & supplier payments
    let purchasesQ = "SELECT paid_amount, payment_type FROM purchases WHERE COALESCE(module_type, 'Wholesale') = $1";
    const purchasesRes = await pool.query(purchasesQ, [targetModule]);

    console.log("Running Query 4 (Expenses)...");
    // 4. Fetch expenses
    let expensesQ = "SELECT amount, payment_type, expense_type FROM expenses WHERE COALESCE(module_type, 'Wholesale') = $1";
    const expensesRes = await pool.query(expensesQ, [targetModule]);

    console.log("Running Query 5 (Salary Payments)...");
    // 5. Fetch actual salaries paid from salary_payments
    let salariesQ = "SELECT amount, payment_type FROM salary_payments WHERE COALESCE(module_type, 'Wholesale') = $1";
    const salariesRes = await pool.query(salariesQ, [targetModule]);

    console.log("Running Query 6 (Rents)...");
    // 6. Fetch rents
    let rentsQ = "SELECT amount FROM rent WHERE COALESCE(module_type, 'Wholesale') = $1";
    const rentsRes = await pool.query(rentsQ, [targetModule]);

    console.log("All queries ran successfully without throwing exceptions!");
    process.exit(0);

  } catch (err) {
    console.error("\nFATAL ERROR CAUGHT IN QUERY ENGINE:");
    console.error(err);
    process.exit(1);
  }
}

testBalances();
