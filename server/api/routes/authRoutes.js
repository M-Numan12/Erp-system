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

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, authController.getUser);

// @route   GET api/auth/test-email
// @desc    Test email from live server
// @access  Public
router.get('/test-email', async (req, res) => {
  try {
    const emailService = require('../utils/emailService');
    await emailService.sendNewDeviceAlert({
      user: { name: 'Live Render Test', email: 'live@erp.com', role: 'admin' },
      ip: '2.2.2.2',
      userAgent: 'render-test',
      location: null
    });
    res.json({ success: true, msg: 'Test email triggered from live Render server!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
