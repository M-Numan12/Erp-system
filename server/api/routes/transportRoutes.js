const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const auth = require('../middleware/auth');

// Get all vehicles
router.get('/', auth, transportController.getVehicles);

// Add new vehicle
router.post('/', auth, transportController.addVehicle);

// Update vehicle
router.put('/:id', auth, transportController.updateVehicle);

// Get Vehicle Ledger (Combined Sales & Purchases & Payments)
router.get('/ledger/:id', auth, transportController.getVehicleLedger);

// Record payment to vehicle
router.post('/payment', auth, transportController.payVehicle);

// Delete vehicle
router.delete('/:id', auth, transportController.deleteVehicle);

module.exports = router;
