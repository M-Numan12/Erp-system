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

      // Check device approval status
      const deviceResult = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND user_agent = $2 AND is_approved = true',
        [parseInt(req.user.id, 10), userAgent]
      );

      console.log(`🔑 [Auth Middleware] Approved devices found in DB: ${deviceResult.rows.length}`);

      if (deviceResult.rows.length === 0) {
        // Check if this user has ANY devices registered in the database
        const countResult = await pool.query(
          'SELECT COUNT(*) FROM user_devices WHERE user_id = $1',
          [parseInt(req.user.id, 10)]
        );
        const hasAnyDevices = parseInt(countResult.rows[0].count, 10) > 0;

        if (!hasAnyDevices) {
          // Migration path: This user was logged in before the update and has 0 registered devices.
          // Auto-approve and register their current active device to prevent logging them out.
          let deviceName = 'Migrated Device';
          try {
            const ua = userAgent || '';
            const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Linux';
            const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : 'Browser';
            deviceName = `${os} / ${browser}`;
          } catch (e) {}

          console.log(`🚀 [Auth Middleware] Auto-migrating and approving active session for user ${req.user.id}`);
          await pool.query(
            `INSERT INTO user_devices (user_id, ip_address, user_agent, device_name, is_approved, location, last_login_at) 
             VALUES ($1, $2, $3, $4, true, 'Local / Unknown', CURRENT_TIMESTAMP)`,
            [parseInt(req.user.id, 10), ip, userAgent, deviceName]
          );
        } else {
          console.warn(`❌ [Auth Middleware] Access DENIED for user ${req.user.id}. No approved device matching UA: "${userAgent}"`);
          return res.status(401).json({ msg: 'Session expired or device unauthorized. Please log in again.' });
        }
      } else {
        // Find if we have a row that matches the current IP exactly
        const exactMatch = deviceResult.rows.find(d => d.ip_address === ip);
        if (exactMatch) {
          // Update last activity for the exact matching IP
          pool.query(
            'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [exactMatch.id]
          ).catch(err => {});
        } else {
          // Check if this IP is already registered in ANY row for this user & UA
          pool.query(
            'SELECT id FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3',
            [parseInt(req.user.id, 10), ip, userAgent]
          ).then(checkRes => {
            if (checkRes.rows.length > 0) {
              // Already exists. Just update its last activity.
              pool.query(
                'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
                [checkRes.rows[0].id]
              ).catch(err => {});
            } else {
              // Safe to update the approved device's IP!
              const activeDevice = deviceResult.rows[0];
              pool.query(
                'UPDATE user_devices SET ip_address = $1, last_login_at = CURRENT_TIMESTAMP WHERE id = $2',
                [ip, activeDevice.id]
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
