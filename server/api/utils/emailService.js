const nodemailer = require('nodemailer');

// Setup SMTP Transporter using environment variables
const getTransporter = () => {
  const user = process.env.EMAIL_USER || 'datawaley.support@gmail.com';
  const pass = process.env.EMAIL_PASS;

  if (!pass) {
    console.warn("⚠️ EMAIL_PASS is not configured. Email alerts will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

/**
 * Sends a security email alert when a user logs in from a new device/IP.
 */
exports.sendNewDeviceAlert = async ({ user, ip, userAgent, location }) => {
  const transporter = getTransporter();
  if (!transporter) return;

  const adminEmail = 'datawaley.support@gmail.com';
  
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
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
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
          <h1>⚠️ Security Alert: Login from New Device</h1>
        </div>
        <div class="content">
          <p class="warning-text">
            A user account has logged in to the <strong>Data Waley ERP System</strong> from a device or location not previously associated with this account.
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
    await transporter.sendMail({
      from: `"Data Waley ERP Security" <${process.env.EMAIL_USER || 'datawaley.support@gmail.com'}>`,
      to: adminEmail,
      subject: `🚨 Security Alert: New Login from ${user.name} (${user.role})`,
      html: htmlContent
    });
    console.log(`✉️ Security alert email sent successfully to ${adminEmail} for user ${user.email}`);
  } catch (err) {
    console.error("❌ Failed to send login alert email:", err.message);
  }
};
