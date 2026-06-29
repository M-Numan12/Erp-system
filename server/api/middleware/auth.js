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

      const deviceResult = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 AND is_approved = true',
        [req.user.id, ip, userAgent]
      );

      if (deviceResult.rows.length === 0) {
        return res.status(401).json({ msg: 'Session expired or device unauthorized. Please log in again.' });
      }
    }
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
