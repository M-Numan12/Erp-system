const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const axios = require('axios');

const checkAndAlertNewDevice = async (user, ip, userAgent) => {
  try {
    console.log(`🔍 Login detected for user ${user.email} (IP: ${ip})`);

    // Geolocation lookup
    let location = null;
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.')) {
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        if (geoRes.data && geoRes.data.status === 'success') {
          location = geoRes.data;
        }
      } catch (geoErr) {
        console.warn("Failed to fetch geolocation details:", geoErr.message);
      }
    }

    // Parse OS and Browser for DB record
    let deviceName = 'Unknown';
    try {
      const ua = userAgent || '';
      const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Linux';
      const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : 'Browser';
      deviceName = `${os} / ${browser}`;
    } catch (e) {}

    // Send alert email asynchronously (runs on every login)
    const emailService = require('../utils/emailService');
    await emailService.sendNewDeviceAlert({ user, ip, userAgent, location });

    const locationStr = location 
      ? `${location.city || 'Unknown City'}, ${location.country_name || 'Unknown Country'}`
      : 'Local / Unknown';

    // Register/update device entry
    await pool.query(
      `INSERT INTO user_devices (user_id, ip_address, user_agent, device_name, location, last_login_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
       ON CONFLICT (user_id, ip_address, user_agent) 
       DO UPDATE SET last_login_at = CURRENT_TIMESTAMP, location = EXCLUDED.location`,
      [user.id, ip, userAgent, deviceName, locationStr]
    );
  } catch (err) {
    console.error("Error in checkAndAlertNewDevice:", err.message);
  }
};


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password, permissions) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, permissions',
      [name, email, password, JSON.stringify([])]
    );

    const user = newUserResult.rows[0];

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        module_type: user.module_type
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { email, password, isAdminLogin } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const user = userResult.rows[0];

    // Plain text comparison
    if (password !== user.password) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Role validation based on login portal
    if (user.role === 'admin') {
      if (!isAdminLogin) {
        return res.status(403).json({ msg: 'Admins are not allowed to log in from here. Please use the admin portal.' });
      }
    } else {
      if (isAdminLogin) {
        return res.status(403).json({ msg: 'Access denied. Regular users cannot log in from the admin portal.' });
      }
    }

    const getModuleType = (email, currentType) => {
      if (currentType) return currentType;
      const em = (email || '').toLowerCase();
      if (em.includes('wholesale')) return 'Wholesale';
      if (em.includes('retail1') || em.includes('retailsaller1')) return 'Retail 1';
      if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) return 'Retail 2';
      return null;
    };

    const finalModuleType = getModuleType(user.email, user.module_type);

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        module_type: finalModuleType
      }
    };

    // Extract IP Address and User-Agent
    const rawIp = req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim() 
      : req.ip || req.connection.remoteAddress;
    const ip = rawIp.replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';

    // Check device approval status
    const deviceResult = await pool.query(
      'SELECT * FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3',
      [user.id, ip, userAgent]
    );

    let isApproved = false;
    if (deviceResult.rows.length > 0) {
      isApproved = deviceResult.rows[0].is_approved;
    } else {
      // It's a new device!
      // Admin is auto-approved to prevent lockout. Others default to pending.
      isApproved = (user.role === 'admin');

      // Geolocation lookup
      let location = null;
      let locationStr = 'Local / Unknown';
      if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.')) {
        try {
          const geoRes = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
          if (geoRes.data && geoRes.data.status === 'success') {
            location = geoRes.data;
            locationStr = `${geoRes.data.city || 'Unknown City'}, ${geoRes.data.country || 'Unknown Country'}`;
          }
        } catch (geoErr) {}
      }

      let deviceName = 'Unknown Device';
      try {
        const ua = userAgent || '';
        const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'Linux';
        const browser = ua.includes('Firefox') ? 'Firefox' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : 'Browser';
        deviceName = `${os} / ${browser}`;
      } catch (e) {}

      await pool.query(
        `INSERT INTO user_devices (user_id, ip_address, user_agent, device_name, is_approved, location, last_login_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [user.id, ip, userAgent, deviceName, isApproved, locationStr]
      );

    }

    if (!isApproved) {
      // Send device approval request email to admin
      let location = null;
      if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.')) {
        try {
          const geoRes = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
          if (geoRes.data && geoRes.data.status === 'success') {
            location = geoRes.data;
          }
        } catch (geoErr) {}
      }
      const emailService = require('../utils/emailService');
      await emailService.sendDeviceApprovalRequest({ 
        user: { id: user.id, name: user.name, email: user.email, role: user.role, module_type: finalModuleType }, 
        ip, 
        userAgent, 
        location 
      });

      return res.status(403).json({ 
        msg: 'Login from this device is pending admin approval. A notification has been sent to the admin. Please try logging in again after approval.' 
      });
    }

    // Run device security check and email notification asynchronously (only if already approved)
    checkAndAlertNewDevice({ id: user.id, name: user.name, email: user.email, role: user.role, module_type: finalModuleType }, ip, userAgent);

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            module_type: finalModuleType,
            permissions: user.permissions || [] 
          } 
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUser = async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, name, email, role, module_type, permissions, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user) {
      const em = (user.email || '').toLowerCase();
      if (!user.module_type) {
        if (em.includes('wholesale')) user.module_type = 'Wholesale';
        else if (em.includes('retail1') || em.includes('retailsaller1')) user.module_type = 'Retail 1';
        else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) user.module_type = 'Retail 2';
      }
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, username, role } = req.body;

  if (!email || !username || !role) {
    return res.status(400).json({ msg: 'Please provide all details (email, username, and role).' });
  }

  try {
    // 1. Verify user exists with matching email, name/username, and role/module_type
    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) 
         AND LOWER(name) = LOWER($2) 
         AND (LOWER(role) = LOWER($3) OR LOWER(module_type) = LOWER($3))`,
      [email.trim(), username.trim(), role.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'No matching account found with these details.' });
    }

    const user = userResult.rows[0];

    // 2. Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Clear any existing codes for this email and save the new one
    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)',
      [email.trim().toLowerCase(), code, expiresAt]
    );

    // 4. Send code via Email
    const emailService = require('../utils/emailService');
    await emailService.sendResetCode(email.trim(), user.name, code);

    // 5. Always log the code to server console for testing/verification safety
    console.log(`🔑 PASSWORD RESET CODE GENERATED: [${code}] for email: <${email.trim()}>`);

    res.json({ success: true, msg: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Error in forgotPassword:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ msg: 'Please provide email and verification code.' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM password_resets 
       WHERE LOWER(email) = LOWER($1) 
         AND code = $2 
         AND expires_at > NOW()`,
      [email.trim(), code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid or expired verification code.' });
    }

    res.json({ success: true, msg: 'Code verified successfully.' });
  } catch (err) {
    console.error('Error in verifyCode:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || !password) {
    return res.status(400).json({ msg: 'Please provide email, verification code, and new password.' });
  }

  try {
    // 1. Verify code again to ensure request integrity
    const result = await pool.query(
      `SELECT * FROM password_resets 
       WHERE LOWER(email) = LOWER($1) 
         AND code = $2 
         AND expires_at > NOW()`,
      [email.trim(), code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid or expired verification code.' });
    }

    // 2. Update user's password in plain text (as per existing schema)
    await pool.query(
      'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2)',
      [password, email.trim()]
    );

    // 3. Cleanup verification code
    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [email.trim()]);

    res.json({ success: true, msg: 'Password reset successful. You can now login.' });
  } catch (err) {
    console.error('Error in resetPassword:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.deviceAction = async (req, res) => {
  const { action, userId, ip, ua } = req.query;

  if (!action || !userId || !ip || !ua) {
    return res.status(400).send('<h1>Missing details. Cannot process request.</h1>');
  }

  try {
    let title = '';
    let message = '';
    let color = '';

    if (action === 'approve') {
      const result = await pool.query(
        `UPDATE user_devices 
         SET is_approved = true 
         WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 
         RETURNING *`,
        [parseInt(userId, 10), ip, ua]
      );

      if (result.rows.length === 0) {
        title = 'Device Not Found';
        message = 'Could not find the pending device login request.';
        color = '#ef4444';
      } else {
        title = 'Device Approved';
        message = 'This device has been successfully authorized to log in.';
        color = '#10b981';
      }
    } else if (action === 'reject') {
      const result = await pool.query(
        `DELETE FROM user_devices 
         WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 
         RETURNING *`,
        [parseInt(userId, 10), ip, ua]
      );

      if (result.rows.length === 0) {
        title = 'Device Not Found';
        message = 'Could not find the pending device login request.';
        color = '#ef4444';
      } else {
        title = 'Device Rejected';
        message = 'This device login request has been successfully rejected and blocked.';
        color = '#f59e0b';
      }
    } else {
      return res.status(400).send('<h1>Invalid action.</h1>');
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: #ffffff;
          }
          .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
          }
          .status-icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: ${color};
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 10px 0;
            letter-spacing: 0.5px;
          }
          p {
            font-size: 15px;
            color: #94a3b8;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .close-btn {
            background-color: ${color};
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
            transition: opacity 0.2s;
          }
          .close-btn:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="status-icon">${action === 'approve' ? '✅' : '❌'}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <button class="close-btn" onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error in deviceAction:', err.message);
    res.status(500).send('<h1>Server Error. Please try again later.</h1>');
  }
};

exports.debugDevices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_devices');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
};
