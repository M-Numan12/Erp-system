const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { credentialVersion } = require('../utils/passwordSecurity');

// Short-lived in-memory cache (8 seconds) for verified user + device sessions
// Prevents 6+ parallel API requests on page load from each making redundant DB roundtrips
const authSessionCache = new Map();
const AUTH_CACHE_TTL_MS = 8000;

const normalizeUserAgent = (ua) => {
  if (!ua) return 'Unknown';
  return ua
    .replace(/\d+[\d.]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const authMiddleware = async function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if no token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    if (req.user) {
      const deviceRecordId = Number(req.user.deviceRecordId);
      if (!Number.isSafeInteger(deviceRecordId) || deviceRecordId <= 0) {
        return res.status(401).json({ msg: 'Please sign in again to register this device.' });
      }

      const userId = parseInt(req.user.id, 10);
      const cacheKey = `${userId}:${deviceRecordId}:${req.user.credentialVersion || ''}`;
      const now = Date.now();
      const cached = authSessionCache.get(cacheKey);

      let dbUser;
      if (cached && now - cached.ts < AUTH_CACHE_TTL_MS) {
        dbUser = cached.dbUser;
      } else {
        // Single combined query for user credential verification + device approval check
        const userResult = await pool.query(
          `SELECT u.name, u.password, ud.id AS approved_device_id
           FROM users u
           LEFT JOIN user_devices ud ON ud.id = $2 AND ud.user_id = u.id AND ud.is_approved = true
           WHERE u.id = $1`,
          [userId, deviceRecordId]
        );
        if (userResult.rows.length === 0) {
          authSessionCache.delete(cacheKey);
          return res.status(401).json({ msg: 'User no longer exists. Authorization denied.' });
        }
        dbUser = userResult.rows[0];
        if (
          req.user.credentialVersion &&
          req.user.credentialVersion === credentialVersion(dbUser.password, process.env.JWT_SECRET) &&
          dbUser.approved_device_id
        ) {
          authSessionCache.set(cacheKey, { dbUser, ts: now });
        }
      }

      req.user.name = dbUser.name;
      if (!req.user.credentialVersion || req.user.credentialVersion !== credentialVersion(dbUser.password, process.env.JWT_SECRET)) {
        authSessionCache.delete(cacheKey);
        return res.status(401).json({ msg: 'Password changed or session expired. Please log in again.' });
      }

      if (!dbUser.approved_device_id) {
        authSessionCache.delete(cacheKey);
        return res.status(401).json({ msg: 'Device access revoked. Please sign in again.' });
      }

      const email = (req.user.email || '').toLowerCase();
      if (email.includes('wholesale')) {
        req.user.module_type = 'Wholesale';
      } else if (email.includes('retail1') || email.includes('retailsaller1')) {
        req.user.module_type = 'Retail 1';
      } else if (email.includes('retail2') || email.includes('retailseller2') || email.includes('wali2022')) {
        req.user.module_type = 'Retail 2';
      }
    }
    next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

authMiddleware.clearCache = () => authSessionCache.clear();
module.exports = authMiddleware;
