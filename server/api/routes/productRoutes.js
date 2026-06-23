const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

// Get all products (with isolation)
router.get('/', auth, productController.getProducts);

// Add a product
router.post('/', auth, productController.addProduct);

// Update a product
router.put('/:id', auth, productController.updateProduct);

// Receive Stock (Stock Inbound)
router.post('/:id/stock', auth, productController.receiveStock);

// Delete a product
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
