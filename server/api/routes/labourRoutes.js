const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');
const auth = require('../middleware/auth');

// 1. GET all labours
router.get('/', auth, labourController.getLabours);

// 2. POST create labour
router.post('/', auth, labourController.createLabour);

// 3. PUT update labour
router.put('/:id', auth, labourController.updateLabour);

// 4. DELETE labour
router.delete('/:id', auth, labourController.deleteLabour);

// 5. GET all work history
router.get('/work-history', auth, labourController.getWorkHistory);

// 6. POST log work entry
router.post('/work-history', auth, labourController.createWorkHistory);

// 7. POST pay group wages
router.post('/pay', auth, labourController.payWages);

module.exports = router;
