const pool = require('../config/db');

const tables = [
  'bank_accounts', 'bill_items', 'bills', 'customers', 'expenses', 
  'investment', 'investments', 'labour_work_history', 'labours', 
  'other_expenses', 'products', 'purchases', 'rent', 'salary', 
  'salary_deductions', 'salary_payments', 'sale_items', 'sales', 
  'stock', 'stock_logs', 'suppliers', 'transport', 'users', 'vehicles'
];

const usersToSeed = [
  {
    name: 'Hassam Admin',
    email: 'hassam4288@gmail.com',
    password: 'admin123',
    role: 'admin',
    permissions: JSON.stringify([
      'wholesale', 'retail', 'users', 'products', 'stock',
      'billing', 'customers', 'suppliers', 'transport',
      'expenses', 'salary', 'profit', 'rent', 'investment',
      'other-expenses'
    ]),
    module_type: null
  },
  {
    name: 'Wholesale Shop',
    email: 'wholesale@erp.com',
    password: 'shop123',
    role: 'user',
    permissions: JSON.stringify([
      'wholesale', 'products', 'stock', 'billing', 'customers',
      'suppliers', 'transport', 'expenses', 'salary', 'profit',
      'rent', 'investment', 'other-expenses'
    ]),
    module_type: 'Wholesale'
  },
  {
    name: 'Retail Shop 1',
    email: 'retail1@erp.com',
    password: 'shop123',
    role: 'user',
    permissions: JSON.stringify([
      'retail', 'products', 'stock', 'billing', 'customers',
      'suppliers', 'transport', 'expenses', 'salary', 'profit',
      'rent', 'investment', 'other-expenses'
    ]),
    module_type: 'Retail 1'
  },
  {
    name: 'Retail Shop 2',
    email: 'retail2@erp.com',
    password: 'shop456',
    role: 'user',
    permissions: JSON.stringify([
      'retail', 'products', 'stock', 'billing', 'customers',
      'suppliers', 'transport', 'expenses', 'salary', 'profit',
      'rent', 'investment', 'other-expenses'
    ]),
    module_type: 'Retail 2'
  }
];

async function resetDatabase() {
  console.log('💥 Starting Database Reset...');
  try {
    // 1. Truncate all tables and reset serial sequences to 1
    const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
    console.log('🧹 Truncating tables and resetting sequences...');
    await pool.query(truncateQuery);
    console.log('✅ All tables successfully truncated. Auto-increment sequences reset to 1.');

    // 2. Seed active users
    console.log('🌱 Seeding active users back to DB...');
    for (const u of usersToSeed) {
      await pool.query(
        `INSERT INTO users (name, email, password, role, permissions, module_type) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.name, u.email, u.password, u.role, u.permissions, u.module_type]
      );
      console.log(`👤 Seeded User: ${u.name} (${u.email})`);
    }

    console.log('🎉 Database reset and seed process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Reset Failed:', err.message);
    process.exit(1);
  }
}

resetDatabase();
