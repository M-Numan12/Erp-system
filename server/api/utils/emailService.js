const axios = require('axios');

/**
 * Sends a security email alert when a user logs in via Resend HTTP API.
 */
exports.sendNewDeviceAlert = async ({ user, ip, userAgent, location }) => {
  const apiKey = process.env.RESEND_API_KEY || 're_igwGk36N_HmnmD6UuThMPSMhbTRrWsogp';
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
  const geoStr = location 
    ? `${location.city || 'Unknown City'}, ${location.region || 'Unknown Region'}, ${location.country_name || 'Unknown Country'}`
    : 'Pending Geolocation Lookup';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          padding: 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 32px 24px;
        }
        .warning-text {
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 24px;
          color: #475569;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 28px;
        }
        .details-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        .details-table td.label {
          font-weight: 600;
          color: #64748b;
          width: 35%;
        }
        .details-table td.value {
          color: #0f172a;
          font-weight: 700;
        }
        .ip-link {
          font-size: 12px;
          color: #3b82f6;
          text-decoration: none;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 ERP System Login Notification</h1>
        </div>
        <div class="content">
          <p class="warning-text">
            A user account has successfully logged in to the <strong>Data Waley ERP System</strong>.
          </p>
          
          <table class="details-table">
            <tr>
              <td class="label">User Name</td>
              <td class="value">${user.name}</td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="value">${user.email}</td>
            </tr>
            <tr>
              <td class="label">Role / Module</td>
              <td class="value">${user.role} (${user.module_type || 'admin'})</td>
            </tr>
            <tr>
              <td class="label">Device / OS</td>
              <td class="value">${deviceName}</td>
            </tr>
            <tr>
              <td class="label">IP Address</td>
              <td class="value">
                ${ip} 
                <a href="https://ipinfo.io/${ip}" target="_blank" class="ip-link">(Inspect IP)</a>
              </td>
            </tr>
            <tr>
              <td class="label">Location</td>
              <td class="value">${geoStr}</td>
            </tr>
            <tr>
              <td class="label">Login Time</td>
              <td class="value">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} (PKT)</td>
            </tr>
          </table>
          
          <p class="warning-text" style="font-size: 13px; font-style: italic; color: #ef4444; font-weight: 600; text-align: center;">
            If this activity was not authorized, please reset the user's password immediately from the Admin Dashboard.
          </p>
        </div>
        <div class="footer">
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
  const apiKey = process.env.RESEND_API_KEY || 're_igwGk36N_HmnmD6UuThMPSMhbTRrWsogp';
  
  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not configured. Reset email skipped.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          padding: 24px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 32px 24px;
          text-align: center;
        }
        .greeting {
          font-size: 16px;
          color: #0f172a;
          margin-bottom: 12px;
          text-align: left;
        }
        .instruction {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 24px;
          text-align: left;
        }
        .code-box {
          display: inline-block;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 6px;
          color: #2563eb;
          background: #eff6ff;
          padding: 16px 32px;
          border-radius: 8px;
          border: 2px dashed #bfdbfe;
          margin: 12px 0 24px 0;
        }
        .expiry-warning {
          font-size: 13px;
          color: #ef4444;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Password Reset Verification Code</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${username},</p>
          <p class="instruction">
            We received a request to reset the password for your account on the <strong>Data Waley ERP System</strong>. Please use the verification code below to proceed:
          </p>
          
          <div class="code-box">${code}</div>
          
          <p class="expiry-warning">
            This verification code is valid for 15 minutes.
          </p>
          
          <p class="instruction" style="font-size: 13px; font-style: italic; color: #64748b;">
            If you did not request a password reset, please ignore this email or secure your account if you feel suspicious.
          </p>
        </div>
        <div class="footer">
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
      to: email,
      subject: `🔑 Reset Code: ${code}`,
      html: htmlContent
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✉️ Reset code email sent successfully to ${email} (Status: ${res.status})`);
  } catch (err) {
    if (err.response) {
      console.error("❌ Resend API failed:", err.response.data);
    } else {
      console.error("❌ Failed to send reset code email via Resend:", err.message);
    }
  }
};
