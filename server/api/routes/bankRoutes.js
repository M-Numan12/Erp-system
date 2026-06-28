const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Temporary authenticated debug route to inspect expenses summary
router.get('/debug-expenses-summary', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT module_type, COUNT(*) FROM expenses GROUP BY module_type');
    const all = await pool.query('SELECT id, description, expense_type, category, amount, expense_date, payment_type, module_type FROM expenses ORDER BY id DESC LIMIT 50');
    res.json({ summary: result.rows, latest: all.rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Get real-time balances for all accounts
router.get('/balances', auth, bankController.getBalances);

// Get real-time balances for ALL modules at once (Admin only)
router.get('/all-balances', auth, bankController.getAllBalances);

// Get all banks
router.get('/', auth, bankController.getBanks);

// Add a bank
router.post('/', auth, bankController.addBank);

// Update a bank account
router.put('/:id', auth, bankController.updateBank);

// Delete a bank
router.delete('/:id', auth, bankController.deleteBank);

// Get Current Balance for a payment method
router.get('/balance/:method', auth, bankController.getMethodBalance);

// Register Closeout / Galla Transfer
router.post('/closeout', auth, bankController.closeout);

// Send Admin Payment to Shop
router.post('/admin-payment', auth, bankController.adminPayment);

// Post Internal Funds Transfer (Bank to Bank / Cash to Bank / Bank to Cash)
router.post('/transfer', auth, bankController.transfer);

module.exports = router;