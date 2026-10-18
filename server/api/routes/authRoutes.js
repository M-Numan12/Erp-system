const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   POST api/auth/forgot-password
// @desc    Request password reset code
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST api/auth/verify-code
// @desc    Verify the reset code
// @access  Public
router.post('/verify-code', authController.verifyCode);

// @route   POST api/auth/reset-password
// @desc    Reset password with verified code
// @access  Public
router.post('/reset-password', authController.resetPassword);

// @route   GET api/auth/device-action
// @desc    Approve or reject a login device
// @access  Public
// Device approvals must use the authenticated admin API: PUT /api/users/devices/:deviceId/approve.
// Public GET approval links were unsafe and have been disabled.
// Unauthenticated device debugging endpoint disabled (exposed device records).
router.get('/check-device-status', authController.checkDeviceStatus);

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, authController.getUser);

module.exports = router;
