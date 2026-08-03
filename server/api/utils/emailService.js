const axios = require('axios');

const normalizeUserAgent = (ua) => {
  if (!ua) return 'Unknown';
  return ua
    .replace(/\d+[\d.]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Sends a security email alert when a user logs in via Resend HTTP API.
 */
exports.sendNewDeviceAlert = async ({ user, ip, userAgent, location, latitude, longitude }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.EMAIL_USER || 'datawaley.support@gmail.com';
  
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not configured. Email alerts will be skipped.");
    return;
  }

  // Format device info from User-Agent string
  let deviceName = 'Unknown Device / Browser';
  try {
    const ua = userAgent || '';
    const os = ua.includes('Windows') ? 'Windows' 
             : ua.includes('Macintosh') ? 'macOS' 
             : ua.includes('Android') ? 'Android' 
             : ua.includes('iPhone') ? 'iOS' 
             : ua.includes('Linux') ? 'Linux' : 'Unknown OS';
             
    const browser = ua.includes('Firefox') ? 'Firefox' 
                  : ua.includes('Chrome') ? 'Chrome' 
                  : ua.includes('Safari') ? 'Safari' 
                  : ua.includes('Edg') ? 'Edge' 
                  : ua.includes('Opera') ? 'Opera' : 'Browser';
                  
    deviceName = `${os} / ${browser}`;
  } catch (e) {
    console.error("Error parsing User-Agent", e);
  }

  // Geolocation string formatting
  let geoStr = location 
    ? `${location.city || 'Unknown City'}, ${location.regionName || 'Unknown Region'}, ${location.country || 'Unknown Country'}`
    : 'Pending Geolocation Lookup';

  if (latitude && longitude) {
    geoStr += ` (<a href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">Open on Google Maps 📍</a>)`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">🔑 ERP System Login Notification</h1>
        </div>
        
        <!-- Content Area -->
        <div class="content" style="padding: 32px 24px;">
          <p class="warning-text" style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; color: #475569;">
            A user account has successfully logged in to the <strong>Data Waley ERP System</strong>.
          </p>
          
          <table class="details-table" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; width: 35%; font-size: 14px;">User Name</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Email Address</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Role / Module</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.role} (${user.module_type || 'admin'})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Device / OS</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${deviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">IP Address</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">
                ${ip} 
                <a href="https://ipinfo.io/${ip}" target="_blank" style="font-size: 12px; color: #3b82f6; text-decoration: none; font-weight: 600; margin-left: 8px;">(Inspect IP)</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Location</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${geoStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Login Time</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} (PKT)</td>
            </tr>
          </table>
          
          <p class="warning-text" style="font-size: 13.5px; font-style: italic; color: #ef4444; font-weight: 600; text-align: center; margin-top: 24px;">
            If this activity was not authorized, please reset the user's password immediately from the Admin Dashboard.
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer" style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated security notification from Data Waley ERP System.<br>
          © 2026 Data Waley Inc. All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await axios.post('https://api.resend.com/emails', {
      from: 'Data Waley Security <onboarding@resend.dev>',
      to: adminEmail,
      subject: `🚨 Login Alert: ${user.name} (${user.role})`,
      html: htmlContent
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✉️ Resend email sent successfully to ${adminEmail} (Status: ${res.status})`);
  } catch (err) {
    if (err.response) {
      console.error("❌ Resend API failed:", err.response.data);
    } else {
      console.error("❌ Failed to send login alert email via Resend:", err.message);
    }
  }
};

/**
 * Sends a password reset code to the user's email via Resend HTTP API.
 */
exports.sendResetCode = async (email, username, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.EMAIL_USER || 'datawaley.support@gmail.com';
  
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not configured. Reset email skipped.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">🔑 Password Reset Verification Code</h1>
        </div>
        
        <!-- Content Area -->
        <div class="content" style="padding: 32px 24px; text-align: center;">
          <p class="greeting" style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0; text-align: left; font-weight: 600;">Dear Admin,</p>
          <p class="instruction" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; text-align: left;">
            We received a request to reset the password for the following user account on the <strong>Data Waley ERP System</strong>:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: left;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 35%; font-size: 14px;">Username / Name:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${username}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b; font-size: 14px;">Account Email:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 14px;">${email}</td>
            </tr>
          </table>
          
          <p class="instruction" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; text-align: left;">
            Please share the verification code below with the user to allow them to reset their password:
          </p>
          
          <div class="code-box" style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 16px 32px; border-radius: 8px; border: 2px dashed #bfdbfe; margin: 12px 0 24px 0; text-align: center;">${code}</div>
          
          <p class="expiry-warning" style="font-size: 13.5px; color: #ef4444; font-weight: 600; margin: 0 0 16px 0;">
            This verification code is valid for 15 minutes.
          </p>
          
          <p class="instruction" style="font-size: 13px; font-style: italic; color: #64748b; text-align: center; margin: 24px 0 0 0;">
            If this request was not authorized, please take security measures.
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer" style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated security notification from Data Waley ERP System.<br>
          © 2026 Data Waley Inc. All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await axios.post('https://api.resend.com/emails', {
      from: 'Data Waley Security <onboarding@resend.dev>',
      to: adminEmail,
      subject: `🔑 Password Reset Code for ${username} (${code})`,
      html: htmlContent
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✉️ Reset code email sent successfully to Admin at ${adminEmail} (Status: ${res.status})`);
  } catch (err) {
    if (err.response) {
      console.error("❌ Resend API failed:", err.response.data);
    } else {
      console.error("❌ Failed to send reset code email via Resend:", err.message);
    }
  }
};

/**
 * Sends a security email alert requesting admin approval for a new device login.
 */
exports.sendDeviceApprovalRequest = async ({ user, ip, userAgent, location, latitude, longitude, deviceId }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.EMAIL_USER || 'datawaley.support@gmail.com';
  const backendUrl = process.env.BACKEND_URL || 'https://erp-backend-3rf8.onrender.com';
  
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not configured. Device approval request email skipped.");
    return;
  }

  // Parse device info from User-Agent string
  let deviceName = 'Unknown Device / Browser';
  try {
    const ua = userAgent || '';
    const os = ua.includes('Windows') ? 'Windows' 
             : ua.includes('Macintosh') ? 'macOS' 
             : ua.includes('Android') ? 'Android' 
             : ua.includes('iPhone') ? 'iOS' 
             : ua.includes('Linux') ? 'Linux' : 'Unknown OS';
             
    const browser = ua.includes('Firefox') ? 'Firefox' 
                  : ua.includes('Chrome') ? 'Chrome' 
                  : ua.includes('Safari') ? 'Safari' 
                  : ua.includes('Edg') ? 'Edge' 
                  : ua.includes('Opera') ? 'Opera' : 'Browser';
                  
    deviceName = `${os} / ${browser}`;
  } catch (e) {}

  // Geolocation string formatting
  let geoStr = location 
    ? `${location.city || 'Unknown City'}, ${location.regionName || 'Unknown Region'}, ${location.country || 'Unknown Country'}`
    : 'Pending Geolocation Lookup';

  if (latitude && longitude) {
    geoStr += ` (<a href="https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">Open on Google Maps 📍</a>)`;
  }

  // Construct approval & rejection links with deviceId
  const normalizedUA = normalizeUserAgent(userAgent);
  const encUA = encodeURIComponent(normalizedUA);
  const approveUrl = `${backendUrl}/api/auth/device-action?action=approve&userId=${user.id}&deviceId=${deviceId || ''}&ip=${ip}&ua=${encUA}`;
  const rejectUrl = `${backendUrl}/api/auth/device-action?action=reject&userId=${user.id}&deviceId=${deviceId || ''}&ip=${ip}&ua=${encUA}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px;">
      <div class="container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">🔒 Device Authorization Request</h1>
        </div>
        
        <!-- Content Area -->
        <div class="content" style="padding: 32px 24px;">
          <p class="warning-text" style="font-size: 15px; line-height: 1.6; margin-bottom: 24px; color: #475569;">
            A login attempt was made on the <strong>Data Waley ERP System</strong> from an unrecognized device. Admin approval is required to allow access.
          </p>
          
          <table class="details-table" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; width: 35%; font-size: 14px;">User Name</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Email Address</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Role / Module</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${user.role} (${user.module_type || 'user'})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Device / OS</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${deviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">IP Address</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${ip}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td class="label" style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 14px;">Location</td>
              <td class="value" style="padding: 12px 16px; color: #0f172a; font-weight: 700; font-size: 14px;">${geoStr}</td>
            </tr>
          </table>
          
          <p class="warning-text" style="font-size: 15px; font-weight: 600; text-align: center; color: #0f172a; margin-bottom: 24px;">
            Please choose an action below to authorize or block this device:
          </p>

          <!-- Side-by-Side buttons using table formatting (supported by Gmail!) -->
          <table style="width: 100%; margin: 24px 0;" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="width: 50%; padding: 0 10px;">
                <a href="${approveUrl}" style="background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; display: block; border: 1px solid #059669; text-align: center; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.2);">
                  Approve Device
                </a>
              </td>
              <td align="center" style="width: 50%; padding: 0 10px;">
                <a href="${rejectUrl}" style="background-color: #ef4444; color: #ffffff !important; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; display: block; border: 1px solid #dc2626; text-align: center; box-shadow: 0 4px 6px -1px rgba(239,68,68,0.2);">
                  Reject & Block
                </a>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Footer -->
        <div class="footer" style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated security verification notification from Data Waley ERP System.<br>
          © 2026 Data Waley Inc. All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await axios.post('https://api.resend.com/emails', {
      from: 'Data Waley Security <onboarding@resend.dev>',
      to: adminEmail,
      subject: `🚨 Device Approval Request: ${user.name} (${user.role})`,
      html: htmlContent
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✉️ Device approval request email sent successfully to ${adminEmail} (Status: ${res.status})`);
  } catch (err) {
    if (err.response) {
      console.error("❌ Resend API failed:", err.response.data);
    } else {
      console.error("❌ Failed to send device approval request email:", err.message);
    }
  }
};
