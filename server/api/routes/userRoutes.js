const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  next();
};

// All routes here require valid JWT AND admin role
router.use(auth, adminAuth);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Device management routes
router.get('/:userId/devices', userController.getUserDevices);
router.delete('/devices/:deviceId', userController.logoutDevice);
router.put('/devices/:deviceId/approve', userController.approveDevice);

module.exports = router;
