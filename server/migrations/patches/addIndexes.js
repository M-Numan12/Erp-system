const pool = require('../config/db');

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);",
  "CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);",
  "CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);",
  "CREATE INDEX IF NOT EXISTS idx_expenses_module_type ON expenses(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);",
  "CREATE INDEX IF NOT EXISTS idx_rent_module_type ON rent(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_rent_rent_date ON rent(rent_date);",
  "CREATE INDEX IF NOT EXISTS idx_salary_module_type ON salary(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_salary_payment_date ON salary(payment_date);",
  "CREATE INDEX IF NOT EXISTS idx_other_expenses_module_type ON other_expenses(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_other_expenses_date ON other_expenses(date);",
  "CREATE INDEX IF NOT EXISTS idx_purchases_module_type ON purchases(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);",
  "CREATE INDEX IF NOT EXISTS idx_investments_module_type ON investments(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(investment_date);",
  "CREATE INDEX IF NOT EXISTS idx_customers_module_type ON customers(module_type);",
  "CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);"
];

async function run() {
  try {
    console.log("Starting index creation...");
    for (const query of indexes) {
      try {
        await pool.query(query);
        console.log(`Executed: ${query}`);
      } catch (e) {
        console.error(`Failed to execute ${query}: ${e.message}`);
      }
    }
    console.log("Indexing complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error during indexing:", err);
    process.exit(1);
  }
}

run();
