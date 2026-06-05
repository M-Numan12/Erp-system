process.env.TZ = 'Asia/Karachi'; // Enforce local time for all application logic
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/rent', require('./routes/rentRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/profit', require('./routes/profitRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/banks', require('./routes/bankRoutes'));
app.use('/api/labours', require('./routes/labourRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Temporary diagnostic endpoint for checking database records
app.get('/api/diag-expenses-temp-xyz', async (req, res) => {
  try {
    const pool = require('./config/db');
    const expenses = await pool.query(`
      SELECT e.id, e.description, e.expense_type, e.category, e.amount, e.expense_date, e.vehicle_id, v.vehicle_number, v.ownership_type 
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      ORDER BY e.id DESC LIMIT 50
    `);
    const vehicles = await pool.query(`
      SELECT id, vehicle_number, ownership_type, driver_name FROM vehicles
    `);
    
    // Check why Expense 111 and Vehicle 19 don't match
    const testMatch = await pool.query(`
      SELECT 
        e.id as expense_id, 
        e.description as expense_desc, 
        v.id as vehicle_id,
        v.vehicle_number as vehicle_num,
        (e.vehicle_id IS NULL) as cond_veh_null,
        (e.expense_type = 'Supplier Vehicle') as cond_type,
        (e.category = 'Transport') as cond_cat,
        (e.description LIKE 'Transport Fare: ' || v.vehicle_number) as cond_like1,
        (e.description LIKE 'Transport Fare: ' || TRIM(v.vehicle_number)) as cond_like2,
        (e.description LIKE '%' || v.vehicle_number || '%') as cond_like3,
        (COALESCE(v.ownership_type, 'Personal') = 'Personal') as cond_owner,
        (v.is_deleted IS NOT TRUE) as cond_not_deleted
      FROM expenses e
      CROSS JOIN vehicles v
      WHERE e.id = 111 AND v.id = 19
    `);

    res.json({ expenses: expenses.rows, vehicles: vehicles.rows, testMatch: testMatch.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Temporary migration runner endpoint
app.get('/api/run-migration-temp-xyz', async (req, res) => {
  const pool = require('./config/db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix by vehicle_id
    const byVehicleId = await client.query(`
      UPDATE expenses e
      SET expense_type = 'Personal Vehicle'
      FROM vehicles v
      WHERE e.vehicle_id = v.id
        AND COALESCE(v.ownership_type, 'Personal') = 'Personal'
        AND e.expense_type = 'Supplier Vehicle'
      RETURNING e.id, e.description, e.vehicle_id
    `);

    // Fix by vehicle number in description
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

    await client.query('COMMIT');
    res.json({
      success: true,
      fixed_by_vehicle_id: byVehicleId.rows,
      fixed_by_vehicle_number: byVehicleNumber.rows,
      count_by_vehicle_id: byVehicleId.rowCount,
      count_by_vehicle_number: byVehicleNumber.rowCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 5000;

// Auto-sync database schema on startup
const syncDatabaseSchema = require('./utils/dbInit');
syncDatabaseSchema().then(() => {
  app.listen(PORT, (err) => {
    if (err) {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
    console.log(`Server started on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database sync:', err);
  // Start server anyway just in case
  app.listen(PORT, () => console.log(`Server running (schema sync failed) on port ${PORT}`));
});