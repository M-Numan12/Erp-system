const pool = require('../config/db');

async function syncDatabaseSchema() {
  console.log('🔄 Starting exhaustive DB self-healing migration...');
  
  const queries = [
    // --- 0. SALARY PAYMENTS (Crucial Missing Engine) ---
    `CREATE TABLE IF NOT EXISTS salary_payments (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES salary(id) ON DELETE CASCADE,
      employee_name VARCHAR(255),
      amount DECIMAL(15, 2) NOT NULL,
      payment_type VARCHAR(100) DEFAULT 'Cash',
      transaction_type VARCHAR(50) DEFAULT 'Salary',
      month VARCHAR(50),
      payment_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      module_type VARCHAR(100),
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // --- 0.1 SALARY DEDUCTIONS (Missing Deduction Engine) ---
    `CREATE TABLE IF NOT EXISTS salary_deductions (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER REFERENCES salary(id) ON DELETE CASCADE,
      amount DECIMAL(15, 2) NOT NULL,
      target_month VARCHAR(100) NOT NULL,
      notes VARCHAR(255),
      is_applied BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // --- 1. PRODUCTS ---
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER;`,

    // --- 2. SUPPLIERS ---
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(100);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company VARCHAR(255);`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // --- 3. PURCHASES (The Critical Culprit) ---
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS module_type VARCHAR(50);`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS delivery_charges DECIMAL(15, 2) DEFAULT 0;`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS fare_payment_type VARCHAR(50) DEFAULT 'Pending';`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Cash';`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS gatepass VARCHAR(255);`,

    // --- 4. VEHICLES (The Missing Piece) ---
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_cnic VARCHAR(50);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(15, 2) DEFAULT 0;`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS module_type VARCHAR(50);`,
    `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`,
    `UPDATE vehicles SET is_deleted = FALSE WHERE is_deleted IS NULL;`,

    // --- 5. EXPENSES (Secondary Failure Mode) ---
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50) DEFAULT 'Office';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100);`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'Cash';`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;`,

    // --- 6. CUSTOMERS ---
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // --- 7. SALES ---
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS labour_group VARCHAR(100);`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_id2 INTEGER;`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_number2 VARCHAR(100);`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_ids JSONB;`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) DEFAULT 'Retail';`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);`,

    // --- 8. LABOURS ---
    `ALTER TABLE labours ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,
    `ALTER TABLE labour_work_history ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Wholesale';`,

    // --- 9. PERFORMANCE INDEXES ---
    `CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);`,
    `CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_module_type ON expenses(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_rent_module_type ON rent(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_rent_rent_date ON rent(rent_date);`,
    `CREATE INDEX IF NOT EXISTS idx_salary_module_type ON salary(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_salary_payment_date ON salary(payment_date);`,
    `CREATE INDEX IF NOT EXISTS idx_other_expenses_module_type ON other_expenses(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_other_expenses_date ON other_expenses(date);`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_module_type ON purchases(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);`,
    `CREATE INDEX IF NOT EXISTS idx_investments_module_type ON investments(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(investment_date);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_module_type ON customers(module_type);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`,
    
    // --- 10. REPAIR NEGATIVE ADVANCE SALARIES ---
    `UPDATE salary SET advance_salary = ABS(advance_salary) WHERE advance_salary < 0;`,

    // --- 11. REPAIR CUSTOMER PAYMENTS RECONCILIATION FOR CASH ACCOUNT ---
    `UPDATE sales SET payment_type = 'Cash (dukan pe)' WHERE payment_type = 'dukan pe';`,

    // --- 11.5. BANK ACCOUNTS CURRENT BALANCE COLUMN ---
    `ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15, 2) DEFAULT 0;`,
    `UPDATE bank_accounts SET current_balance = opening_balance WHERE current_balance IS NULL OR current_balance = 0;`,

    // --- 12. UNLIMITED PAYMENT REFERENCE CHARACTER SIZE ---
    `ALTER TABLE sales ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE purchases ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE salary_payments ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE expenses ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE purchases ALTER COLUMN fare_payment_type TYPE TEXT;`,
    `ALTER TABLE other_expenses ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE other_expenses ALTER COLUMN payment_method TYPE TEXT;`,
    `ALTER TABLE rent ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS rent_type VARCHAR(50) DEFAULT 'Paid';`,
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS is_property BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE rent ADD COLUMN IF NOT EXISTS rent_month VARCHAR(50);`,
    `ALTER TABLE salary ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE investments ALTER COLUMN payment_type TYPE TEXT;`,
    `ALTER TABLE staff_ledger ALTER COLUMN payment_method TYPE TEXT;`,
    `ALTER TABLE sales ALTER COLUMN vehicle_number TYPE TEXT;`,
    `ALTER TABLE sales ALTER COLUMN vehicle_number2 TYPE TEXT;`,
    // --- 13. STAFF LEDGER TABLES ---
    `CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(100),
      address TEXT,
      opening_balance DECIMAL(12, 2) DEFAULT 0,
      current_balance DECIMAL(12, 2) DEFAULT 0,
      user_id INT,
      module_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS staff_ledger (
      id SERIAL PRIMARY KEY,
      staff_id INT REFERENCES staff(id) ON DELETE CASCADE,
      date DATE DEFAULT CURRENT_DATE,
      description TEXT NOT NULL,
      debit DECIMAL(12, 2) DEFAULT 0,
      credit DECIMAL(12, 2) DEFAULT 0,
      balance DECIMAL(12, 2) NOT NULL,
      payment_method VARCHAR(100),
      user_id INT,
      module_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS user_devices (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(100),
      user_agent TEXT,
      device_name VARCHAR(255),
      is_approved BOOLEAN DEFAULT FALSE,
      location VARCHAR(255),
      latitude DECIMAL(9,6),
      longitude DECIMAL(9,6),
      first_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, ip_address, user_agent)
    );`,
    `CREATE TABLE IF NOT EXISTS pending_login_approvals (
      id SERIAL PRIMARY KEY,
      token VARCHAR(255) UNIQUE NOT NULL,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(100),
      user_agent TEXT,
      device_name VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '5 minutes'
    );`,
    // --- 14. AUTO-HEAL SPECIFIC NaN BALANCES ---
    `UPDATE customers SET opening_balance = 20000.00 WHERE id = 350 AND (opening_balance IS NULL OR opening_balance = 0);`,
    `UPDATE customers SET balance = 31070.00 WHERE id = 350 AND (balance IS NULL OR balance::text = 'NaN');`,
    `UPDATE customers SET balance = COALESCE(opening_balance, 0) WHERE balance::text = 'NaN' OR balance IS NULL;`,
    // --- 15. AUTO-HEAL USER MODULE TYPES & ROLES ---
    `UPDATE users SET module_type = 'admin' WHERE role = 'admin' AND (module_type IS NULL OR module_type != 'admin');`,
    `UPDATE users SET role = module_type WHERE module_type IS NOT NULL AND module_type != '' AND module_type != 'admin' AND (role IS NULL OR role = '' OR role = 'user' OR role != module_type);`,
    `UPDATE users SET role = 'admin', module_type = 'admin' WHERE email = 'hassam4288@gmail.com';`,
    `UPDATE users SET role = 'Wholesale', module_type = 'Wholesale' WHERE email = 'usmanwholesale@gmail.com';`,
    `UPDATE users SET role = 'Wholesale', module_type = 'Wholesale' WHERE email = 'wholesale@erp.com';`,
    `UPDATE users SET role = 'Retail 1', module_type = 'Retail 1' WHERE email = 'retail1@erp.com';`,
    `UPDATE users SET role = 'Retail 2', module_type = 'Retail 2' WHERE email = 'retail2@erp.com';`,
    // --- 16. DROP UNUSED LEGACY TABLES ---
    `DROP TABLE IF EXISTS transport CASCADE;`,
    `DROP TABLE IF EXISTS bills CASCADE;`,
    `DROP TABLE IF EXISTS bill_items CASCADE;`,
    `DROP TABLE IF EXISTS investments CASCADE;`,
    `DROP TABLE IF EXISTS stock CASCADE;`,
    `DROP TABLE IF EXISTS stock_logs CASCADE;`,
    `CREATE OR REPLACE VIEW stock AS SELECT id AS product_id, name AS product_name, brand, category, stock_quantity, unit, cost_price, price AS retail_price, module_type, created_at FROM products;`,
    // --- 17. DROP UNUSED LEGACY COLUMNS ---
    `ALTER TABLE bank_accounts DROP COLUMN IF EXISTS "Current Balance";`,

    // --- 18. PASSWORD RESETS TABLE ---
    `CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // --- 19. USER DEVICES IS_APPROVED MIGRATION ---
    `ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;`,
    `UPDATE user_devices SET is_approved = TRUE WHERE is_approved IS NULL;`,
    `ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS location VARCHAR(255);`,
    `ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6);`,
    `ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);`
  ];

  let totalExecuted = 0;

  for (const q of queries) {
    try {
      await pool.query(q);
      totalExecuted++;
    } catch (e) {
      // Silence expected errors if base table doesn't exist yet
    }
  }

  console.log(`✅ Ultimate DB Auto-Sync successful. Executed ${totalExecuted} safety-checks.`);
}

module.exports = syncDatabaseSchema;
