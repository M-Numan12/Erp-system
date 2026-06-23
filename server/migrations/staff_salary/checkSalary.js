const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db');

async function check() {
  try {
    console.log('Salary table columns:');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'salary'
      ORDER BY ordinal_position;
    `);
    result.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type, '| nullable:', r.is_nullable));

    // Generate month value same as route will
    const paymentDate = new Date().toLocaleDateString('en-CA');
    const month = new Date(paymentDate).toLocaleString('default', { month: 'long', year: 'numeric' });
    console.log('\nDerived month value:', month);

    // Test insert with month
    const test = await pool.query(`
      INSERT INTO salary 
      (employee_name, designation, cnic, amount, advance_salary, joining_date, payment_date, month, status, notes, user_id, module_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `, ['Test','Tester','12345',1000,0,paymentDate,paymentDate,month,'Paid','test',1,'Wholesale']);
    
    console.log('\nTest insert SUCCESS! id:', test.rows[0].id);
    await pool.query('DELETE FROM salary WHERE employee_name = $1', ['Test']);
    console.log('Cleaned up test row.');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

check();
