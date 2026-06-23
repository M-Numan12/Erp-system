const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const auth = require('../middleware/auth');

// Get all sales
router.get('/', auth, saleController.getSales);

// Create a new sale (Bill)
router.post('/', auth, saleController.createSale);

// Get sale details with items
router.get('/:id', auth, saleController.getSaleById);

// Get customer ledger
router.get('/ledger/:customerId', auth, saleController.getCustomerLedger);

// Receive Payment from Customer
router.post('/payment', auth, saleController.receivePayment);

// Undo Payment Endpoint
router.post('/payment/undo', auth, saleController.undoPayment);

// Post Manual Ledger Adjustment (Debit or Credit) for Customer
router.post('/adjustment', auth, saleController.postAdjustment);

// Update a sale (Bill Edit) - Admin only
router.put('/:id', auth, saleController.updateSale);

// Delete a sale - Admin only
router.delete('/:id', auth, saleController.deleteSale);

// Update a specific item in a sale (from Ledger) - Admin only
router.post('/update-item', auth, saleController.updateSaleItem);

// Process a Sale Return (Full or Partial)
router.post('/return', auth, saleController.processReturn);

// Send Custom WhatsApp Message
router.post('/send-message', auth, saleController.sendCustomMessage);

// Send Custom WhatsApp Document (PDF)
router.post('/send-document', auth, saleController.sendCustomDocument);

module.exports = router;