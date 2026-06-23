const pool = require('../config/db');
(async () => {
  const vId = 3;
  try {
    const salesTrips = await pool.query(
      `SELECT id, customer_name as party_name, delivery_charges as amount, created_at as date, 'Outward (Sale)' as trip_type, payment_type FROM sales WHERE vehicle_id = $1`, [vId]
    );
    const purchaseTrips = await pool.query(
      `SELECT p.id, s.name as party_name, p.delivery_charges as amount, p.purchase_date as date, 'Inward (Stock)' as trip_type, p.fare_payment_type as payment_type FROM purchases p JOIN suppliers s ON p.supplier_id = s.id WHERE p.vehicle_id = $1`, [vId]
    );
    const payments = await pool.query(
      `SELECT id, description as party_name, amount, expense_date as date, CASE WHEN category = 'Fare Payment' THEN 'Payment' ELSE 'Expense (Deduction)' END as trip_type, payment_type FROM expenses WHERE vehicle_id = $1`, [vId]
    );
    const combined = [...salesTrips.rows, ...purchaseTrips.rows, ...payments.rows].sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`SUCCESS for Vehicle 3: Found ${combined.length} entries.`);
    process.exit(0);
  } catch (e) {
    console.error('🚨 SERVER ERROR DETECTED FOR VEHICLE 3:', e.message);
    process.exit(1);
  }
})();
