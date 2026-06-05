/**
 * One-time migration: Fix expense_type for personal vehicle expenses
 * 
 * Strategy:
 * 1. Find all expenses with expense_type = 'Supplier Vehicle' and category = 'Transport'
 * 2. Extract the vehicle number from the description (e.g. "Transport Fare: LWN-1469")
 * 3. Look up that vehicle number in the vehicles table
 * 4. If ownership_type = 'Personal', update expense_type to 'Personal Vehicle'
 * 5. Also fix via vehicle_id if it exists on the expense row
 */

require('dotenv').config();
const pool = require('./config/db');

async function fixPersonalVehicleExpenses() {
  const client = await pool.connect();
  try {
    console.log('Starting migration: fix personal vehicle expenses...\n');

    // Step 1: Fix by vehicle_id (most reliable)
    const byVehicleId = await client.query(`
      UPDATE expenses e
      SET expense_type = 'Personal Vehicle'
      FROM vehicles v
      WHERE e.vehicle_id = v.id
        AND COALESCE(v.ownership_type, 'Personal') = 'Personal'
        AND e.expense_type = 'Supplier Vehicle'
      RETURNING e.id, e.description, e.vehicle_id
    `);
    console.log(`Fixed ${byVehicleId.rowCount} records via vehicle_id.`);
    byVehicleId.rows.forEach(r => console.log(`  - Expense #${r.id}: ${r.description}`));

    // Step 2: Fix by extracting vehicle number from description
    // Description format: "Transport Fare: VEHICLE_NUMBER" or "Return Transport Fare: VEHICLE_NUMBER"
    const byVehicleNumber = await client.query(`
      UPDATE expenses e
      SET expense_type = 'Personal Vehicle'
      FROM vehicles v
      WHERE e.vehicle_id IS NULL
        AND e.expense_type = 'Supplier Vehicle'
        AND e.category = 'Transport'
        AND (
          e.description LIKE 'Transport Fare: ' || v.vehicle_number
          OR e.description LIKE 'Return Transport Fare: ' || v.vehicle_number
        )
        AND COALESCE(v.ownership_type, 'Personal') = 'Personal'
        AND (v.is_deleted IS NOT TRUE)
      RETURNING e.id, e.description
    `);
    console.log(`\nFixed ${byVehicleNumber.rowCount} records via vehicle number in description.`);
    byVehicleNumber.rows.forEach(r => console.log(`  - Expense #${r.id}: ${r.description}`));

    const total = byVehicleId.rowCount + byVehicleNumber.rowCount;
    console.log(`\n✅ Migration complete. Total records fixed: ${total}`);

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixPersonalVehicleExpenses();
