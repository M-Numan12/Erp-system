const pool = require('../config/db');

async function run() {
  try {
    // Check user
    const userRes = await pool.query(
      "SELECT id, name, email, role, module_type FROM users WHERE email = $1",
      ['hassam4288@gmail.com']
    );
    console.log('USER:', JSON.stringify(userRes.rows, null, 2));

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const mod = user.module_type || 'Wholesale';
      
      // Check bank accounts for this module
      const banksRes = await pool.query(
        "SELECT bank_name, account_number, opening_balance, module_type FROM bank_accounts WHERE COALESCE(module_type, 'Wholesale') = $1 OR LOWER(bank_name) = 'cash'",
        [mod]
      );
      console.log('\nBANK ACCOUNTS:', JSON.stringify(banksRes.rows, null, 2));
      
      // Check cash sales for this module
      const salesRes = await pool.query(
        "SELECT COUNT(*) as cnt, SUM(paid_amount) as total FROM sales WHERE COALESCE(sale_type, 'Wholesale') = $1 AND payment_type ILIKE 'Cash%'",
        [mod]
      );
      console.log('\nCASH SALES:', JSON.stringify(salesRes.rows, null, 2));
      
      // Check expenses for this module
      const expRes = await pool.query(
        "SELECT COUNT(*) as cnt, SUM(amount) as total FROM expenses WHERE COALESCE(module_type, 'Wholesale') = $1 AND payment_type ILIKE 'Cash%'",
        [mod]
      );
      console.log('\nCASH EXPENSES:', JSON.stringify(expRes.rows, null, 2));
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
run();
