const axios = require('axios');

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

  if (!to) {
    console.log('❌ No recipient phone number provided for WhatsApp');
    return;
  }
  // Sanitize phone number (remove spaces, plus, dashes)
  let cleanPhone = String(to).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    // Convert local Pakistan number to international (replace leading 0 with 92)
    cleanPhone = '92' + cleanPhone.substring(1);
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
 * Formats and triggers billing receipts for both the Customer and Admin
 */
async function sendWhatsAppBill(sale, items) {
  const adminPhone = process.env.ADMIN_PHONE || '923004269347'; // Default fallback admin phone

  let itemsList = '';
  items.forEach((item, idx) => {
    itemsList += `${idx + 1}. *${item.product_name || item.name}* (Qty: ${item.qty} @ Rs.${item.rate || item.price})\n`;
  });

  const messageBody = `🌟 *DATA WALEY CEMENT ERP* 🌟\n` +
    `-----------------------------------------\n` +
    `🧾 *NEW BILL GENERATED*\n\n` +
    `*Bill No:* #00${sale.id}\n` +
    `*Customer:* ${sale.customer_name || 'Walk-in Customer'}\n` +
    `*Phone:* ${sale.customer_phone || 'N/A'}\n` +
    `*Payment Mode:* ${sale.payment_type || 'Cash'}\n` +
    `*Module:* ${sale.sale_type || 'Wholesale'}\n\n` +
    `*Items Ordered:*\n${itemsList}\n` +
    `*Total Amount:* Rs. ${parseFloat(sale.total_amount).toLocaleString()}\n` +
    `*Discount:* Rs. ${parseFloat(sale.discount || 0).toLocaleString()}\n` +
    `*Delivery Charges:* Rs. ${parseFloat(sale.delivery_charges || 0).toLocaleString()}\n` +
    `-----------------------------------------\n` +
    `🔥 *Net Payable:* Rs. ${parseFloat(sale.net_amount).toLocaleString()}\n` +
    `💵 *Paid Amount:* Rs. ${parseFloat(sale.paid_amount).toLocaleString()}\n` +
    `💰 *Remaining Bill Balance:* Rs. ${parseFloat(sale.balance_amount).toLocaleString()}\n` +
    `👤 *Total Outstanding Balance:* Rs. ${parseFloat(sale.customer_balance || 0).toLocaleString()}\n\n` +
    `Thank you for your business! 🙏`;

  // 1. Send to Customer if valid phone is provided
  if (sale.customer_phone && sale.customer_phone.trim() !== '') {
    await sendWhatsAppMessage(sale.customer_phone, messageBody);
  }

  // 2. Send copy to Admin
  if (adminPhone) {
    const adminMessage = `🚨 *ADMIN COPY: NEW BILL GENERATED*\n\n${messageBody}`;
    await sendWhatsAppMessage(adminPhone, adminMessage);
  }
}

module.exports = { sendWhatsAppBill, sendWhatsAppMessage };
