const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function initializeCloudDatabase() {
  console.log('🚀 Initializing all missing core tables on cloud database...');

  try {
    // 1. bank_accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id SERIAL PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        account_title VARCHAR(255),
        account_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        module_type VARCHAR(100) DEFAULT 'Wholesale',
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ bank_accounts table verified.');

    // 2. labours
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        contact VARCHAR(100),
        rate_per_day DECIMAL(10, 2) DEFAULT 0,
        cnic VARCHAR(100),
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ labours table verified.');

    // 3. labour_work_history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labour_work_history (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(255) NOT NULL,
        bill_id INTEGER,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Unpaid',
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ labour_work_history table verified.');

    // 4. vehicles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        ownership_type VARCHAR(50),
        vehicle_number VARCHAR(100),
        driver_name VARCHAR(100),
        driver_cnic VARCHAR(50),
        driver_phone VARCHAR(50),
        total_earnings DECIMAL(15,2) DEFAULT 0,
        user_id INTEGER,
        module_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ vehicles table verified.');

    // 5. sales
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        total_amount DECIMAL(12, 2) DEFAULT 0,
        discount DECIMAL(12, 2) DEFAULT 0,
        delivery_charges DECIMAL(12, 2) DEFAULT 0,
        net_amount DECIMAL(12, 2) DEFAULT 0,
        paid_amount DECIMAL(12, 2) DEFAULT 0,
        balance_amount DECIMAL(12, 2) DEFAULT 0,
        payment_type VARCHAR(50) DEFAULT 'Cash',
        user_id INTEGER,
        vehicle_id INTEGER,
        vehicle_number VARCHAR(50),
        sale_type VARCHAR(50) DEFAULT 'Retail',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sales table verified.');

    // 6. sale_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER,
        product_name VARCHAR(255),
        qty DECIMAL(12, 2),
        rate DECIMAL(12, 2),
        subtotal DECIMAL(12, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ sale_items table verified.');

    // 7. purchases
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        vehicle_number VARCHAR(100),
        quantity DECIMAL(10,2) DEFAULT 0,
        rate DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        balance_amount DECIMAL(15,2) DEFAULT 0,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        module_type VARCHAR(50),
        user_id INTEGER,
        vehicle_id INTEGER,
        delivery_charges DECIMAL(15,2) DEFAULT 0,
        fare_payment_type VARCHAR(50) DEFAULT 'Pending',
        payment_type VARCHAR(50) DEFAULT 'Cash'
      );
    `);
    console.log('✅ purchases table verified.');

    // 8. stock_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        vehicle_number VARCHAR(100),
        quantity DECIMAL(10,2),
        log_type VARCHAR(20) DEFAULT 'IN',
        module_type VARCHAR(50),
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ stock_logs table verified.');

    // 9. Quick safety column checks for existing tables
    const bankCols = [
      ['opening_balance', 'DECIMAL(15, 2) DEFAULT 0'],
      ['module_type', 'VARCHAR(100) DEFAULT \'Wholesale\''],
      ['user_id', 'INTEGER']
    ];
    for (const [col, type] of bankCols) {
      await pool.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ bank_accounts table patched.');
    
    // 10. Quick safety column checks for purchases
    const purchaseCols = [
      ['vehicle_id', 'INTEGER'],
      ['delivery_charges', 'DECIMAL(15, 2) DEFAULT 0'],
      ['fare_payment_type', 'VARCHAR(50) DEFAULT \'Pending\''],
      ['payment_type', 'VARCHAR(50) DEFAULT \'Cash\'']
    ];
    for (const [col, type] of purchaseCols) {
      await pool.query(`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ${col} ${type};`);
    }
    console.log('✅ purchases table patched.');

    console.log('\n🎉 ALL CORE TABLES INITIALIZED AND SYNCHRONIZED ON CLOUD DATABASE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  }
}

initializeCloudDatabase();
