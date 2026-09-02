process.env.TZ = 'Asia/Karachi'; // Enforce local time for all application logic
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Ensure temp directory exists for PDF uploads
const tempDir = path.join(__dirname, 'public', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Serve temp PDF files publicly (for UltraMsg to fetch)
app.use('/temp', express.static(path.join(__dirname, 'public', 'temp')));

// Init Middleware - allow large base64 JSON payloads (PDFs can be 2-5MB encoded)
app.use(express.json({ limit: '15mb' }));

// CORS configuration - handle all origins and preflight requests properly
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Define Routes
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/users', require('./api/routes/userRoutes'));
app.use('/api/products', require('./api/routes/productRoutes'));
app.use('/api/stock', require('./api/routes/stockRoutes'));
app.use('/api/customers', require('./api/routes/customerRoutes'));
app.use('/api/suppliers', require('./api/routes/supplierRoutes'));
app.use('/api/transport', require('./api/routes/transportRoutes'));
app.use('/api/expenses', require('./api/routes/expenseRoutes'));
app.use('/api/other-expenses', require('./api/routes/otherExpensesRoutes'));
app.use('/api/salary', require('./api/routes/salaryRoutes'));
app.use('/api/sales', require('./api/routes/saleRoutes'));
app.use('/api/rent', require('./api/routes/rentRoutes'));
app.use('/api/investments', require('./api/routes/investmentRoutes'));
app.use('/api/staff', require('./api/routes/staffRoutes'));
app.use('/api/profit', require('./api/routes/profitRoutes'));
app.use('/api/purchases', require('./api/routes/purchaseRoutes'));
app.use('/api/banks', require('./api/routes/bankRoutes'));
app.use('/api/labours', require('./api/routes/labourRoutes'));
app.use('/api/admin', require('./api/routes/adminRoutes'));

const PORT = process.env.PORT || 5000;

// Start listening immediately so Render health check passes without delay
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
  console.log(`Server started on port ${PORT}`);

  // Auto-sync database schema asynchronously in background
  const syncDatabaseSchema = require('./api/utils/dbInit');
  syncDatabaseSchema()
    .then(() => console.log('Database schema initialization completed.'))
    .catch(err => console.error('Failed to initialize database sync:', err));
});