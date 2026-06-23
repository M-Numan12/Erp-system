const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

// Get all customers (with isolation)
router.get('/', auth, customerController.getCustomers);

// Add a customer
router.post('/', auth, customerController.addCustomer);

// Update a customer
router.put('/:id', auth, customerController.updateCustomer);

// Delete a customer
router.delete('/:id', auth, customerController.deleteCustomer);

module.exports = router;
