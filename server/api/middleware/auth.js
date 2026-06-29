const jwt = require('jsonwebtoken');
const pool = require('../config/db');

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
      const email = (req.user.email || '').toLowerCase();
      if (email.includes('wholesale')) {
        req.user.module_type = 'Wholesale';
      } else if (email.includes('retail1') || email.includes('retailsaller1')) {
        req.user.module_type = 'Retail 1';
      } else if (email.includes('retail2') || email.includes('retailseller2') || email.includes('wali2022')) {
        req.user.module_type = 'Retail 2';
      }

      // Check device approval status
      const rawIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : req.ip || req.connection.remoteAddress;
      const ip = rawIp.replace('::ffff:', '');
      const userAgent = req.headers['user-agent'] || '';

      console.log(`🔑 [Auth Middleware] Checking User: ${req.user.id}, IP: ${ip}, UA: "${userAgent}"`);

      // Find an approved device for this user with the same User-Agent signature
      const deviceResult = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND user_agent = $2 AND is_approved = true',
        [parseInt(req.user.id, 10), userAgent]
      );

      console.log(`🔑 [Auth Middleware] Approved devices found in DB: ${deviceResult.rows.length}`);

      if (deviceResult.rows.length === 0) {
        console.warn(`❌ [Auth Middleware] Access DENIED for user ${req.user.id}. No approved device matching UA: "${userAgent}"`);
        return res.status(401).json({ msg: 'Session expired or device unauthorized. Please log in again.' });
      }

      // If IP has changed, dynamically update the device IP in the database
      const activeDevice = deviceResult.rows[0];
      if (activeDevice.ip_address !== ip) {
        pool.query(
          'UPDATE user_devices SET ip_address = $1, last_login_at = CURRENT_TIMESTAMP WHERE id = $2',
          [ip, activeDevice.id]
        ).catch(err => console.error('Failed to update device IP in middleware:', err.message));
      } else {
        pool.query(
          'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP WHERE id = $2',
          [activeDevice.id]
        ).catch(err => {});
      }
    }
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
