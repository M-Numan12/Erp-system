require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'Numan1206@',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'erp_system'
});

async function deleteRetail2() {
  console.log('🗑️  Starting Retail 2 data removal...');
  const tables = [
    { table: 'salary_payments',      col: 'module_type' },
    { table: 'salary_deductions',    col: null }, // join through salary
    { table: 'salary',               col: 'module_type' },
    { table: 'labour_work_history',  col: 'module_type' },
    { table: 'labours',              col: 'module_type' },
    { table: 'sale_items',           col: null }, // linked to sales
    { table: 'sales',                col: 'module_type' },
    { table: 'purchases',            col: 'module_type' },
    { table: 'expenses',             col: 'module_type' },
    { table: 'other_expenses',       col: 'module_type' },
    { table: 'rent',                 col: 'module_type' },
    { table: 'investments',          col: 'module_type' },
    { table: 'customers',            col: 'module_type' },
    { table: 'suppliers',            col: 'module_type' },
    { table: 'products',             col: 'module_type' },
    { table: 'bank_accounts',        col: 'module_type' },
    { table: 'transactions',         col: 'module_type' },
    { table: 'users',                col: 'module_type' },
  ];

  for (const { table, col } of tables) {
    if (!col) continue; // skip tables without direct module_type
    try {
      const res = await pool.query(
        `DELETE FROM ${table} WHERE ${col} = 'Retail 2' RETURNING id`
      );
      console.log(`✅ ${table}: ${res.rowCount} rows deleted`);
    } catch (e) {
      console.log(`⚠️  ${table}: skipped (${e.message})`);
    }
  }

  // Also delete sale_items for Retail 2 sales
  try {
    const res = await pool.query(
      `DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE module_type = 'Retail 2') RETURNING id`
    );
    console.log(`✅ sale_items (Retail 2): ${res.rowCount} rows deleted`);
  } catch (e) {
    console.log(`⚠️  sale_items: skipped (${e.message})`);
  }

  // salary_deductions linked to Retail 2 salary staff
  try {
    const res = await pool.query(
      `DELETE FROM salary_deductions WHERE staff_id IN (SELECT id FROM salary WHERE module_type = 'Retail 2') RETURNING id`
    );
    console.log(`✅ salary_deductions (Retail 2): ${res.rowCount} rows deleted`);
  } catch (e) {
    console.log(`⚠️  salary_deductions: skipped (${e.message})`);
  }

  console.log('\n🎉 All Retail 2 data has been removed!');
  await pool.end();
  process.exit(0);
}

deleteRetail2().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
