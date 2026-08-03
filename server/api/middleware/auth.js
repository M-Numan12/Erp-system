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

      // Extract IP and User-Agent
      const rawIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : req.ip || req.connection.remoteAddress;
      const ip = rawIp.replace('::ffff:', '');
      const userAgent = req.headers['user-agent'] || '';

      const normalizedUA = normalizeUserAgent(userAgent);

      // Device approval check for all users (including Admin)
      const deviceResult = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND is_approved = true AND (user_agent = $2 OR user_agent = $3 OR ip_address = $4)',
        [parseInt(req.user.id, 10), normalizedUA, userAgent, ip]
      );

        let finalDevices = deviceResult.rows;
        if (finalDevices.length === 0) {
          const fallbackApproved = await pool.query(
            'SELECT * FROM user_devices WHERE user_id = $1 AND is_approved = true LIMIT 1',
            [parseInt(req.user.id, 10)]
          );
          finalDevices = fallbackApproved.rows;
        }

        if (finalDevices.length === 0) {
          console.warn(`❌ [Auth Middleware] Access DENIED for user ${req.user.id}. No approved device matching UA: "${userAgent}"`);
          return res.status(401).json({ msg: 'Session expired or device unauthorized. Please log in again.' });
        } else {
          // Find if we have a row that matches the current IP exactly
          const exactMatch = deviceResult.rows.find(d => d.ip_address === ip);
          if (exactMatch) {
            pool.query(
              'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP, user_agent = $1 WHERE id = $2',
              [normalizedUA, exactMatch.id]
            ).catch(err => {});
          } else {
            pool.query(
              'SELECT id FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND (user_agent = $3 OR user_agent = $4)',
              [parseInt(req.user.id, 10), ip, normalizedUA, userAgent]
            ).then(checkRes => {
              if (checkRes.rows.length > 0) {
                pool.query(
                  'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP, user_agent = $1 WHERE id = $2',
                  [normalizedUA, checkRes.rows[0].id]
                ).catch(err => {});
              } else {
                const activeDevice = deviceResult.rows[0];
                pool.query(
                  'UPDATE user_devices SET ip_address = $1, last_login_at = CURRENT_TIMESTAMP, user_agent = $2 WHERE id = $3',
                  [ip, normalizedUA, activeDevice.id]
                ).catch(err => {});
              }
            }).catch(err => {});
          }
        }
    }
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
