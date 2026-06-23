const pool = require('../config/db');

async function seed() {
  try {
    // Delete test leftovers to be clean
    await pool.query("DELETE FROM salary_payments WHERE notes LIKE '%TEST SEED%'");
    await pool.query("DELETE FROM bank_accounts WHERE bank_name LIKE '%TEST%'");
    await pool.query("DELETE FROM salary WHERE employee_name LIKE '%TEST%'");

    // 1. Create sample staff
    const s1 = await pool.query(
      "INSERT INTO salary (employee_name, designation, amount, advance_salary, module_type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["TEST STAFF ALPHA", "Developer", 45000, 5000, "Wholesale"]
    );
    console.log("Seeded Staff:", s1.rows[0]);

    // 2. Create sample Accounts
    await pool.query(
      "INSERT INTO bank_accounts (bank_name, account_title, account_number, opening_balance, module_type) VALUES ($1, $2, $3, $4, $5)",
      ["TEST Cash", "Main Vault", "CASH-001", 250000, "Wholesale"]
    );
    await pool.query(
      "INSERT INTO bank_accounts (bank_name, account_title, account_number, opening_balance, module_type) VALUES ($1, $2, $3, $4, $5)",
      ["TEST HBL Bank", "Admin Fund", "HBL-0982", 500000, "Wholesale"]
    );
    console.log("Seeded Accounts.");

    process.exit(0);
  } catch (err) {
    console.error("Seeding Error:", err);
    process.exit(1);
  }
}
seed();
