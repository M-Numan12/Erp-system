const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const auth = require('../middleware/auth');

// Get all suppliers (with isolation)
router.get('/', auth, supplierController.getSuppliers);

// Add a supplier
router.post('/', auth, supplierController.addSupplier);

// Update a supplier
router.put('/:id', auth, supplierController.updateSupplier);

// Delete a supplier
router.delete('/:id', auth, supplierController.deleteSupplier);

module.exports = router;
