const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const normalizeUserAgent = (ua) => {
  if (!ua) return 'Unknown';
  return ua
    .replace(/\d+[\d.]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = async function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if no token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = decoded.user;
    if (req.user) {
      // Check if user's password has changed since the token was issued
      const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [parseInt(req.user.id, 10)]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ msg: 'User no longer exists. Authorization denied.' });
      }
      
      const dbUser = userResult.rows[0];
      if (!req.user.passwordHash || req.user.passwordHash !== dbUser.password) {
        return res.status(401).json({ msg: 'Password changed or session expired. Please log in again.' });
      }

      const email = (req.user.email || '').toLowerCase();
      if (email.includes('wholesale')) {
        req.user.module_type = 'Wholesale';
      } else if (email.includes('retail1') || email.includes('retailsaller1')) {
        req.user.module_type = 'Retail 1';
      } else if (email.includes('retail2') || email.includes('retailseller2') || email.includes('wali2022')) {
        req.user.module_type = 'Retail 2';
      }

      const isUserAdmin = (req.user.role || '').toLowerCase().includes('admin') || (req.user.email || '').toLowerCase().trim() === 'datawaley.support@gmail.com' || (req.user.email || '').toLowerCase().trim() === 'hassam4288@gmail.com';

      // A JWT is valid only for the device approved at login.
      // Deleting the device record revokes its token on the next API call.
      const deviceRecordId = Number(req.user.deviceRecordId);
      if (!Number.isSafeInteger(deviceRecordId) || deviceRecordId <= 0) {
        return res.status(401).json({ msg: 'Please sign in again to register this device.' });
      }
      const approval = await pool.query(
        'SELECT id FROM user_devices WHERE id = $1 AND user_id = $2 AND is_approved = true',
        [deviceRecordId, req.user.id]
      );
      if (!approval.rows.length) {
        return res.status(401).json({ msg: 'Device access revoked. Please sign in again.' });
      }
    }
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
