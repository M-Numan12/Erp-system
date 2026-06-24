const axios = require('axios');
const https = require('https');
const querystring = require('querystring');

/**
 * Sanitizes a phone number for WhatsApp (specifically handles Pakistani numbers robustly).
 * Converts Urdu/Arabic digits, removes non-numeric chars, and corrects leading zero issues.
 */
function sanitizeWhatsAppPhone(phone) {
  if (!phone) return '';
  let str = String(phone);
  const urduDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = 0; i < 10; i++) {
    str = str.replace(urduDigits[i], englishDigits[i]);
  }
  let clean = str.replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }
  if (clean.startsWith('92')) {
    if (clean.startsWith('920')) {
      clean = '92' + clean.substring(3);
    }
  } else if (clean.startsWith('0')) {
    clean = '92' + clean.substring(1);
  } else if (clean.length === 10 && clean.startsWith('3')) {
    clean = '92' + clean;
  }
  return clean;
}

/**
 * Sends a WhatsApp message using a configured gateway (like UltraMsg, Green-API, Wassenger, etc.)
 * Fallbacks cleanly to logging if no API is configured so the system never crashes.
 */
async function sendWhatsAppMessage(to, body) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM || 'whatsapp:+14155238886'; // Twilio's official shared sandbox number

  const apiUrl = process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com/instance174172/messages/chat';
  const token = process.env.WHATSAPP_TOKEN || '4722xwbvpu3mdq18';

  const cleanPhone = sanitizeWhatsAppPhone(to);
  if (!cleanPhone) {
    console.log(`❌ Invalid or empty recipient phone number provided for WhatsApp: "${to}"`);
    return;
  }

  // OPTION A: Twilio (No personal phone needed, sends from Twilio's system number)
  if (twilioSid && twilioToken) {
    try {
      const formattedTo = `whatsapp:+${cleanPhone}`;
      const params = new URLSearchParams();
      params.append('From', twilioFrom);
      params.append('To', formattedTo);
      params.append('Body', body);

      const authHeader = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        params,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      console.log(`✅ Twilio WhatsApp successfully sent to ${cleanPhone}`);
      return;
    } catch (err) {
      console.error(`❌ Twilio WhatsApp failed to ${cleanPhone}:`, err.response?.data || err.message);
      return;
    }
  }

  // OPTION B: Scanned Gateways (UltraMsg / Green-API)
  if (!apiUrl) {
    console.log(`[WhatsApp Logger] Message to ${cleanPhone}:\n${body}\n(Set TWILIO or WHATSAPP credentials in Render to send live)`);
    return;
  }

  try {
    if (apiUrl.includes('ultramsg')) {
      const params = new URLSearchParams();
      params.append('token', token);
      params.append('to', cleanPhone);
      params.append('body', body);

      await axios.post(apiUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } else {
      await axios.post(apiUrl, {
        to: cleanPhone,
        chatId: `${cleanPhone}@c.us`,
        message: body,
        body: body,
        token: token
      });
    }
    console.log(`✅ Gateway WhatsApp successfully sent to ${cleanPhone}`);
  } catch (err) {
    console.error(`❌ Gateway WhatsApp failed to ${cleanPhone}:`, err.message);
  }
}

/**
 * Sends a PDF/Document via WhatsApp scan gateways (like UltraMsg) using base64.
 */
async function sendWhatsAppDocument(to, base64Data, filename = 'Ledger.pdf') {
  const instanceUrl = process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com/instance174172/messages/chat';
  const token = process.env.WHATSAPP_TOKEN || '4722xwbvpu3mdq18';

  const cleanPhone = sanitizeWhatsAppPhone(to);
  if (!cleanPhone) {
    console.log(`❌ Invalid or empty recipient phone number provided for WhatsApp Document: "${to}"`);
    return;
  }

  // Ensure document has the correct data URI prefix for UltraMsg
  let documentData = base64Data;
  if (!documentData.startsWith('data:')) {
    documentData = `data:application/pdf;base64,${documentData}`;
  }

  // Build the document endpoint URL
  const docApiUrl = instanceUrl
    .replace(/\/messages\/chat(\/?)?$/, '/messages/document')
    .replace(/\/chat(\/?)?$/, '/messages/document');

  console.log(`📤 Sending PDF document to ${cleanPhone} via UltraMsg...`);
  console.log(`📍 Endpoint: ${docApiUrl}`);

  // Use native https for large payloads to avoid axios body size issues
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      token: token,
      to: cleanPhone,
      filename: filename,
      document: documentData
    });

    const urlObj = new URL(docApiUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ UltraMsg Document Response: ${JSON.stringify(parsed)}`);
          if (parsed.sent === 'true' || parsed.sent === true) {
            resolve(parsed);
          } else {
            reject(new Error(`UltraMsg rejected document: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          console.error('❌ UltraMsg Document raw response:', data);
          reject(new Error(`Invalid JSON response from UltraMsg: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Document WhatsApp network error to ${cleanPhone}:`, err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Formats and triggers billing receipts for both the Customer and Admin
 */
async function sendWhatsAppBill(sale, items) {
  const adminPhone = process.env.ADMIN_PHONE || '923004269347'; // Default fallback admin phone
  const isWholesale = !sale.sale_type || String(sale.sale_type).toLowerCase() === 'wholesale';

  // 1. Build Items List for Admin (always has rates)
  let adminItemsList = '';
  items.forEach((item, idx) => {
    adminItemsList += `${idx + 1}. *${item.product_name || item.name}* (Qty: ${item.qty} @ Rs.${item.rate || item.price})\n`;
  });

  // 2. Build Items List for Customer (has rates only if NOT wholesale)
  let customerItemsList = '';
  items.forEach((item, idx) => {
    if (isWholesale) {
      customerItemsList += `${idx + 1}. *${item.product_name || item.name}* (Qty: ${item.qty})\n`;
    } else {
      customerItemsList += `${idx + 1}. *${item.product_name || item.name}* (Qty: ${item.qty} @ Rs.${item.rate || item.price})\n`;
    }
  });

  // 3. Build Message Body for Admin (always has full details)
  const adminMessage = `🚨 *ADMIN COPY: NEW BILL GENERATED*\n\n` +
    `🌟 *DATA WALEY CEMENT ERP* 🌟\n` +
    `-----------------------------------------\n` +
    `🧾 *NEW BILL GENERATED*\n\n` +
    `*Bill No:* #00${sale.id}\n` +
    `*Customer:* ${sale.customer_name || 'Walk-in Customer'}\n` +
    `*Phone:* ${sale.customer_phone || 'N/A'}\n` +
    `*Payment Mode:* ${sale.payment_type || 'Cash'}\n` +
    `*Module:* ${sale.sale_type || 'Wholesale'}\n\n` +
    `*Items Ordered:*\n${adminItemsList}\n` +
    `*Total Amount:* Rs. ${parseFloat(sale.total_amount).toLocaleString()}\n` +
    `*Discount:* Rs. ${parseFloat(sale.discount || 0).toLocaleString()}\n` +
    `*Delivery Charges:* Rs. ${parseFloat(sale.delivery_charges || 0).toLocaleString()}\n` +
    `-----------------------------------------\n` +
    `🔥 *Net Payable:* Rs. ${parseFloat(sale.net_amount).toLocaleString()}\n` +
    `💵 *Paid Amount:* Rs. ${parseFloat(sale.paid_amount).toLocaleString()}\n` +
    `💰 *Remaining Bill Balance:* Rs. ${parseFloat(sale.balance_amount).toLocaleString()}\n` +
    `👤 *Total Outstanding Balance:* Rs. ${parseFloat(sale.customer_balance || 0).toLocaleString()}\n\n` +
    `Thank you for your business! 🙏`;

  // 4. Build Message Body for Customer
  let customerMessage = '';
  if (isWholesale) {
    customerMessage = `🌟 *DATA WALEY CEMENT ERP* 🌟\n` +
      `-----------------------------------------\n` +
      `🧾 *NEW BILL GENERATED*\n\n` +
      `*Bill No:* #00${sale.id}\n` +
      `*Customer:* ${sale.customer_name || 'Walk-in Customer'}\n` +
      `*Phone:* ${sale.customer_phone || 'N/A'}\n` +
      `*Payment Mode:* ${sale.payment_type || 'Cash'}\n` +
      `*Module:* ${sale.sale_type || 'Wholesale'}\n\n` +
      `*Items Ordered:*\n${customerItemsList}\n` +
      `-----------------------------------------\n` +
      `Thank you for your business! 🙏`;
  } else {
    customerMessage = `🌟 *DATA WALEY CEMENT ERP* 🌟\n` +
      `-----------------------------------------\n` +
      `🧾 *NEW BILL GENERATED*\n\n` +
      `*Bill No:* #00${sale.id}\n` +
      `*Customer:* ${sale.customer_name || 'Walk-in Customer'}\n` +
      `*Phone:* ${sale.customer_phone || 'N/A'}\n` +
      `*Payment Mode:* ${sale.payment_type || 'Cash'}\n` +
      `*Module:* ${sale.sale_type || 'Wholesale'}\n\n` +
      `*Items Ordered:*\n${customerItemsList}\n` +
      `*Total Amount:* Rs. ${parseFloat(sale.total_amount).toLocaleString()}\n` +
      `*Discount:* Rs. ${parseFloat(sale.discount || 0).toLocaleString()}\n` +
      `*Delivery Charges:* Rs. ${parseFloat(sale.delivery_charges || 0).toLocaleString()}\n` +
      `-----------------------------------------\n` +
      `🔥 *Net Payable:* Rs. ${parseFloat(sale.net_amount).toLocaleString()}\n` +
      `💵 *Paid Amount:* Rs. ${parseFloat(sale.paid_amount).toLocaleString()}\n` +
      `💰 *Remaining Bill Balance:* Rs. ${parseFloat(sale.balance_amount).toLocaleString()}\n` +
      `👤 *Total Outstanding Balance:* Rs. ${parseFloat(sale.customer_balance || 0).toLocaleString()}\n\n` +
      `Thank you for your business! 🙏`;
  }

  // 1. Send to Customer if valid phone is provided
  if (sale.customer_phone && sale.customer_phone.trim() !== '') {
    await sendWhatsAppMessage(sale.customer_phone, customerMessage);
  }

  // 2. Send copy to Admin
  if (adminPhone) {
    await sendWhatsAppMessage(adminPhone, adminMessage);
  }
}

module.exports = { sendWhatsAppBill, sendWhatsAppMessage, sendWhatsAppDocument, sanitizeWhatsAppPhone };
