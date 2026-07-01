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

      // Check device approval status
      const rawIp = req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : req.ip || req.connection.remoteAddress;
      const ip = rawIp.replace('::ffff:', '');
      const userAgent = req.headers['user-agent'] || '';

      const normalizedUA = normalizeUserAgent(userAgent);
      console.log(`🔑 [Auth Middleware] Checking User: ${req.user.id}, IP: ${ip}, UA: "${userAgent}" (Normalized: "${normalizedUA}")`);

      // Check device approval status matching normalized or legacy raw UA
      const deviceResult = await pool.query(
        'SELECT * FROM user_devices WHERE user_id = $1 AND is_approved = true AND (user_agent = $2 OR user_agent = $3)',
        [parseInt(req.user.id, 10), normalizedUA, userAgent]
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
            [parseInt(req.user.id, 10), ip, normalizedUA, deviceName]
          );
        } else {
          // COMMENTED OUT FOR BYPASS: Instead of returning 401, we auto-approve the new device session
          // console.warn(`❌ [Auth Middleware] Access DENIED for user ${req.user.id}. No approved device matching UA: "${userAgent}"`);
          // return res.status(401).json({ msg: 'Session expired or device unauthorized. Please log in again.' });

          console.log(`🚀 [Auth Middleware] Auto-approving active session for user ${req.user.id}`);
          let deviceName = 'Auto-Approved Device';
          try {
            const ua = userAgent || '';
            const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Linux';
            const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : 'Browser';
            deviceName = `${os} / ${browser}`;
          } catch (e) {}

          await pool.query(
            `INSERT INTO user_devices (user_id, ip_address, user_agent, device_name, is_approved, location, last_login_at) 
             VALUES ($1, $2, $3, $4, true, 'Local / Unknown', CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, ip_address, user_agent)
             DO UPDATE SET is_approved = true, last_login_at = CURRENT_TIMESTAMP`,
            [parseInt(req.user.id, 10), ip, normalizedUA, deviceName]
          ).catch(err => console.error("Error auto-approving in middleware:", err.message));
        }
      } else {
        // Find if we have a row that matches the current IP exactly
        const exactMatch = deviceResult.rows.find(d => d.ip_address === ip);
        if (exactMatch) {
          // Update last activity and ensure user_agent is normalized
          pool.query(
            'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP, user_agent = $1 WHERE id = $2',
            [normalizedUA, exactMatch.id]
          ).catch(err => {});
        } else {
          // Check if this IP is already registered in ANY row for this user & UA
          pool.query(
            'SELECT id FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND (user_agent = $3 OR user_agent = $4)',
            [parseInt(req.user.id, 10), ip, normalizedUA, userAgent]
          ).then(checkRes => {
            if (checkRes.rows.length > 0) {
              // Already exists. Just update its last activity and normalize UA
              pool.query(
                'UPDATE user_devices SET last_login_at = CURRENT_TIMESTAMP, user_agent = $1 WHERE id = $2',
                [normalizedUA, checkRes.rows[0].id]
              ).catch(err => {});
            } else {
              // Safe to update the approved device's IP and normalize UA!
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
