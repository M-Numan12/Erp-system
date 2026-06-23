const pool = require('../config/db');
(async () => {
  try {
    const vehicles = await pool.query('SELECT id, vehicle_number FROM vehicles');
    console.log(`Found ${vehicles.rows.length} vehicles to test.`);
    
    for (const v of vehicles.rows) {
      const vId = v.id;
      try {
        await pool.query(`SELECT id, customer_name as party_name, delivery_charges as amount, created_at as date, 'Outward (Sale)' as trip_type, payment_type FROM sales WHERE vehicle_id = $1`, [vId]);
        await pool.query(`SELECT p.id, s.name as party_name, p.delivery_charges as amount, p.purchase_date as date, 'Inward (Stock)' as trip_type, p.fare_payment_type as payment_type FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE p.vehicle_id = $1`, [vId]);
        await pool.query(`SELECT id, description as party_name, amount, expense_date as date, CASE WHEN category = 'Fare Payment' THEN 'Payment' ELSE 'Expense (Deduction)' END as trip_type, payment_type FROM expenses WHERE vehicle_id = $1`, [vId]);
      } catch (e) {
        console.log(`🚨 ERROR DETECTED for Vehicle ${v.vehicle_number} (ID ${v.id}):`, e.message);
      }
    }
    console.log('Full Sweep Finished.');
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
