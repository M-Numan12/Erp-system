/**
 * Debug script: check what's in the DB
 */
require('dotenv').config();
const pool = require('./config/db');

async function debug() {
  const client = await pool.connect();
  try {
    // 1. Show all Supplier Vehicle / Transport expenses
    const expenses = await client.query(`
      SELECT id, description, expense_type, category, vehicle_id, module_type
      FROM expenses
      WHERE category = 'Transport'
      ORDER BY id DESC
      LIMIT 20
    `);
    console.log('=== Transport Expenses ===');
    expenses.rows.forEach(r => console.log(r));

    // 2. Show all personal vehicles
    const vehicles = await client.query(`
      SELECT id, vehicle_number, driver_name, ownership_type, module_type
      FROM vehicles
      WHERE ownership_type = 'Personal' AND (is_deleted IS NOT TRUE)
    `);
    console.log('\n=== Personal Vehicles ===');
    vehicles.rows.forEach(r => console.log(r));

    // 3. Show ALL vehicles
    const allVehicles = await client.query(`
      SELECT id, vehicle_number, driver_name, ownership_type, module_type
      FROM vehicles
      WHERE is_deleted IS NOT TRUE
      LIMIT 20
    `);
    console.log('\n=== All Vehicles ===');
    allVehicles.rows.forEach(r => console.log(r));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

debug();
