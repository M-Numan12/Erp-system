const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { sendWhatsAppBill, sendWhatsAppMessage } = require('../utils/whatsapp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');


const isAdmin = (req) => req.user.role === 'admin';

router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM sales';
    let params = [];

    if (type) {
      if (type === 'Wholesale') {
        query += ' WHERE (sale_type=$1 OR sale_type IS NULL)';
      } else {
        query += ' WHERE sale_type=$1';
      }
      params.push(type);
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 500;
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a new sale (Bill)
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_name, customer_phone, total_amount, discount,
      delivery_charges, net_amount, paid_amount, balance_amount,
      payment_type, items, sale_type, vehicle_type, vehicle_id, labour_group
    } = req.body;

    const finalModule = isAdmin(req) ? (sale_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    // 0. Auto-Create or find Customer
    let finalCustomerId = null;
    if (customer_name && customer_name.trim().toLowerCase() !== 'walk-in customer') {
      let cQuery = 'SELECT id FROM customers WHERE name=$1 AND module_type=$2';
      let cParams = [customer_name, finalModule];
      if (customer_phone) { cQuery += ' AND phone=$3'; cParams.push(customer_phone); }

      let c = await client.query(cQuery, cParams);
      if (c.rows.length > 0) {
        finalCustomerId = c.rows[0].id;
        if (req.body.customer_address) {
          await client.query('UPDATE customers SET address=$1 WHERE id=$2', [req.body.customer_address, finalCustomerId]);
        }
      } else {
        const newCust = await client.query(
          'INSERT INTO customers (name, phone, address, balance, user_id, module_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [customer_name, customer_phone || '', req.body.customer_address || '', 0, req.user.id, finalModule]
        );
        finalCustomerId = newCust.rows[0].id;
      }
    }

    // 1. Insert into sales table
    let vehicleIds = [];
    if (req.body.vehicle_ids) {
      vehicleIds = Array.isArray(req.body.vehicle_ids) ? req.body.vehicle_ids.map(Number) : [Number(req.body.vehicle_ids)];
    } else if (vehicle_id && vehicle_id !== '') {
      vehicleIds = [Number(vehicle_id)];
    }
    vehicleIds = vehicleIds.filter(id => !isNaN(id) && id > 0);

    let vehicleNumbers = [];
    if (vehicleIds.length > 0) {
      const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ');
      const vRes = await client.query(`SELECT vehicle_number FROM vehicles WHERE id IN (${placeholders})`, vehicleIds);
      vehicleNumbers = vRes.rows.map(r => r.vehicle_number);
    }

    const vNumber1 = (vehicle_type === 'Supplier' && req.body.vehicle_number) ? req.body.vehicle_number : (vehicleNumbers.join(', ') || null);
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    const saleResult = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_id, vehicle_id2, vehicle_number, vehicle_number2, vehicle_ids, items, status, labour_group, vehicle_type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING id`,
      [finalCustomerId, customer_name, customer_phone || '', req.body.customer_address || '', total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, finalModule, req.user.id, vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, JSON.stringify(items), 'Completed', labour_group || null, vehicle_type || null]
    );
    const saleId = saleResult.rows[0].id;

    // 2. Inventory Pre-check
    const productIds = [...new Set(items.map(item => item.product_id || item.id))];
    if (productIds.length > 0) {
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
      const productsCheck = await client.query(
        `SELECT id, name, stock_quantity FROM products WHERE id IN (${placeholders})`,
        productIds
      );

      const productMap = {};
      productsCheck.rows.forEach(p => { productMap[p.id] = p; });

      for (const item of items) {
        const prodId = item.product_id || item.id;
        const requestedQty = parseFloat(item.qty || 0);
        const pData = productMap[prodId];

        if (pData) {
          const currentInv = parseFloat(pData.stock_quantity || 0);
          if (requestedQty > currentInv) {
            throw new Error(`OUT OF STOCK PREVENTED: Available: ${currentInv}, Requested: ${requestedQty} for "${pData.name}". Transaction blocked.`);
          }
        }
      }
    }

    // 3. Insert items and update stock
    const operations = items.map(async (item) => {
      const prodId = item.product_id || item.id;
      const prodName = item.product_name || item.name;
      const rate = parseFloat(item.rate || item.price) || 0;
      const parsedQty = parseFloat(item.qty) || 0;
      const subtotal = parsedQty * rate;

      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [saleId, prodId, prodName, parsedQty, rate, subtotal]
      );

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [parsedQty, prodId]
      );
    });

    await Promise.all(operations);

    // Update customer balance if credit sale
    const balAmt = parseFloat(balance_amount);
    if (finalCustomerId && !isNaN(balAmt) && balAmt !== 0) {
      await client.query(
        'UPDATE customers SET balance = balance + $1 WHERE id = $2',
        [balAmt, finalCustomerId]
      );
    }

    // Automatic Transport Earnings Update
    if (vehicle_type && vehicleIds.length > 0) {
      const fareAmount = parseFloat(delivery_charges) || 0;
      const farePerVehicle = fareAmount / vehicleIds.length;
      for (const id of vehicleIds) {
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [farePerVehicle, id]
        );
      }
    }

    // Fetch updated customer balance
    let customerBalance = 0;
    if (finalCustomerId) {
      const custRes = await client.query('SELECT balance FROM customers WHERE id = $1', [finalCustomerId]);
      if (custRes.rows.length > 0) {
        customerBalance = parseFloat(custRes.rows[0].balance || 0);
      }
    }

    await client.query('COMMIT');

    // WhatsApp notification async
    const fullSale = {
      id: saleId,
      customer_name,
      customer_phone,
      payment_type,
      sale_type: finalModule,
      total_amount,
      discount,
      delivery_charges,
      net_amount,
      paid_amount,
      balance_amount,
      customer_balance: customerBalance
    };
    sendWhatsAppBill(fullSale, items).catch(err => console.error('WhatsApp failed:', err));

    res.json({ success: true, saleId, customer_balance: customerBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sale Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get sale details with items
router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await pool.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    if (sale.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const items = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    res.json({ ...sale.rows[0], items: items.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get customer ledger
router.get('/ledger/:customerId', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `
      SELECT s.*, 
      COALESCE(s.vehicle_number, v1.vehicle_number, '—') as vehicle_number,
      v2.vehicle_number as vehicle_number2,
      (SELECT JSON_AGG(si) FROM (
        SELECT si.id, si.product_id, si.product_name as name, si.qty, si.rate, si.subtotal, p.brand 
        FROM sale_items si 
        LEFT JOIN products p ON si.product_id = p.id 
        WHERE si.sale_id = s.id
      ) si) as items
      FROM sales s 
      LEFT JOIN vehicles v1 ON s.vehicle_id = v1.id
      LEFT JOIN vehicles v2 ON s.vehicle_id2 = v2.id
      WHERE s.customer_id = $1`;
    let params = [req.params.customerId];

    if (from && to) {
      query += ` AND s.created_at >= $2 AND s.created_at <= $3`;
      params.push(from + " 00:00:00", to + " 23:59:59");
    }

    query += ' ORDER BY s.created_at DESC';
    const ledger = await pool.query(query, params);
    res.json(ledger.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Receive Payment from Customer
router.post('/payment', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_id, amount, payment_reference, payment_type, module_type } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    await client.query(
      'UPDATE customers SET balance = balance - $1 WHERE id = $2',
      [parsedAmount, customer_id]
    );

    const cust = await client.query('SELECT name FROM customers WHERE id=$1', [customer_id]);
    const custName = cust.rows[0]?.name || 'Unknown';

    const insertRes = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, total_amount, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id) 
      VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7) RETURNING id`,
      [customer_id, custName, amount, -amount, payment_reference ? `${payment_type || 'Cash'} (${payment_reference})` : (payment_type || 'Cash'), module_type, req.user.id]
    );

    await client.query('COMMIT');

    const custPhoneRes = await pool.query('SELECT phone FROM customers WHERE id = $1', [customer_id]);
    const custPhone = custPhoneRes.rows[0]?.phone;
    const paymentMessage = `💰 *PAYMENT RECEIPT*\n` +
      `-----------------------------------------\n` +
      `🧾 *Customer:* ${custName}\n` +
      `📞 *Phone:* ${custPhone || 'N/A'}\n` +
      `💵 *Amount Received:* Rs. ${parseFloat(amount).toLocaleString()}\n` +
      `🆔 *Reference:* ${payment_reference || 'N/A'}\n` +
      `💳 *Payment Type:* ${payment_type || 'Cash'}\n` +
      `🗓️ *Date:* ${new Date().toLocaleString()}\n` +
      `-----------------------------------------`;

    if (custPhone) await sendWhatsAppMessage(custPhone, paymentMessage);
    const adminPhone = process.env.ADMIN_PHONE || '923004269347';
    const adminMessage = `🚨 *ADMIN COPY: PAYMENT RECEIPT*\n\n${paymentMessage}`;
    await sendWhatsAppMessage(adminPhone, adminMessage);

    res.json({ success: true, recordId: insertRes.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Undo Payment Endpoint
router.post('/payment/undo', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { payment_id } = req.body;
    if (!payment_id) throw new Error('payment_id is required');

    const saleRes = await client.query('SELECT * FROM sales WHERE id = $1', [payment_id]);
    if (saleRes.rows.length === 0) throw new Error('Payment record not found');
    const sale = saleRes.rows[0];
    const { customer_id, paid_amount, payment_type, payment_reference } = sale;
    const parsedPaidAmount = parseFloat(paid_amount);
    if (isNaN(parsedPaidAmount)) {
      throw new Error('Invalid paid amount in record');
    }

    await client.query('UPDATE customers SET balance = balance + $1 WHERE id = $2', [parsedPaidAmount, customer_id]);
    await client.query('DELETE FROM sales WHERE id = $1', [payment_id]);

    await client.query('COMMIT');

    const custRes = await pool.query('SELECT phone FROM customers WHERE id = $1', [customer_id]);
    const custPhone = custRes.rows[0]?.phone;
    const message = `⚠️ *PAYMENT REVERSED*\n` +
      `-----------------------------\n` +
      `🧾 Customer ID: ${customer_id}\n` +
      `💰 Amount: Rs. ${parseFloat(paid_amount).toLocaleString()}\n` +
      `📄 Reference: ${payment_reference || 'N/A'}\n` +
      `🕒 Date: ${new Date().toLocaleString()}\n` +
      `-----------------------------`;

    if (custPhone) await sendWhatsAppMessage(custPhone, message);
    const adminPhone = process.env.ADMIN_PHONE || '923004269347';
    const adminMsg = `🚨 *ADMIN COPY: PAYMENT REVERSED*\n\n${message}`;
    await sendWhatsAppMessage(adminPhone, adminMsg);

    res.json({ success: true, message: 'Payment undone and notifications sent' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Undo Payment Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Post Manual Ledger Adjustment (Debit or Credit) for Customer
router.post('/adjustment', auth, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin role required for ledger adjustments' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { customer_id, amount, notes, type, module_type } = req.body;
    const amt = parseFloat(amount) || 0;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    let netAmount = 0;
    let paidAmount = 0;
    let balanceImpact = 0;

    if (type === 'Debit') {
      // Debit Adjustment: Increases what they owe us (Debit increases Receivable).
      netAmount = amt;
      paidAmount = 0;
      balanceImpact = amt;
    } else {
      // Credit Adjustment: Decreases what they owe us (like a payment).
      netAmount = 0;
      paidAmount = amt;
      balanceImpact = -amt;
    }

    const desc = `[${type} Adjustment] ${notes || ''}`;

    const cust = await client.query('SELECT name FROM customers WHERE id=$1', [customer_id]);
    const custName = cust.rows[0]?.name || 'Unknown';

    // 1. Insert Adjustment into Sales Table
    const adjustRes = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, total_amount, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_number) 
      VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, NULL) RETURNING *`,
      [customer_id, custName, netAmount, paidAmount, balanceImpact, desc, finalModule, req.user.id]
    );

    // 2. Update Customer Running Balance
    await client.query(
      `UPDATE customers SET balance = balance + $1 WHERE id = $2`,
      [balanceImpact, customer_id]
    );

    await client.query('COMMIT');
    res.json(adjustRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Customer Adjustment Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update a sale (Bill Edit) - Admin only
router.put('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Access denied' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      customer_name, customer_phone, customer_address, total_amount, discount,
      delivery_charges, net_amount, paid_amount, balance_amount,
      payment_type, items, vehicle_id, vehicle_type
    } = req.body;

    let vehicleIds = [];
    if (req.body.vehicle_ids) {
      vehicleIds = Array.isArray(req.body.vehicle_ids) ? req.body.vehicle_ids.map(Number) : [Number(req.body.vehicle_ids)];
    } else if (vehicle_id && vehicle_id !== '') {
      vehicleIds = [Number(vehicle_id)];
    }
    vehicleIds = vehicleIds.filter(id => !isNaN(id) && id > 0);

    let vehicleNumbers = [];
    if (vehicleIds.length > 0) {
      const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ');
      const vRes = await client.query(`SELECT vehicle_number FROM vehicles WHERE id IN (${placeholders})`, vehicleIds);
      vehicleNumbers = vRes.rows.map(r => r.vehicle_number);
    }

    const vNumber1 = (vehicle_type === 'Supplier' && req.body.vehicle_number) ? req.body.vehicle_number : (vehicleNumbers.join(', ') || null);
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    // Revert old stock
    const oldItems = await client.query('SELECT product_id, qty FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of oldItems.rows) {
      await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.qty, item.product_id]);
    }

    // Revert old customer balance and vehicle earnings
    const oldSaleRes = await client.query('SELECT customer_id, balance_amount, vehicle_id, vehicle_id2, vehicle_ids, delivery_charges, vehicle_type FROM sales WHERE id = $1', [req.params.id]);
    const oldSale = oldSaleRes.rows[0];
    const oldBalanceAmt = parseFloat(oldSale?.balance_amount);
    if (oldSale && oldSale.customer_id && !isNaN(oldBalanceAmt) && oldBalanceAmt !== 0) {
      await client.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [oldBalanceAmt, oldSale.customer_id]);
    }

    if (oldSale && oldSale.vehicle_type && oldSale.vehicle_type !== '') {
      let oldVehicleIds = [];
      if (oldSale.vehicle_ids) {
        try {
          oldVehicleIds = typeof oldSale.vehicle_ids === 'string' ? JSON.parse(oldSale.vehicle_ids) : oldSale.vehicle_ids;
        } catch (e) { }
      } else if (oldSale.vehicle_id) {
        oldVehicleIds = [oldSale.vehicle_id];
      }
      oldVehicleIds = oldVehicleIds.filter(id => !isNaN(id) && id > 0);

      if (oldVehicleIds.length > 0) {
        const oldFareAmount = parseFloat(oldSale.delivery_charges) || 0;
        const oldFarePerVehicle = oldFareAmount / oldVehicleIds.length;
        for (const id of oldVehicleIds) {
          await client.query(
            `UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2`,
            [oldFarePerVehicle, id]
          );
        }
      }
    }

    // Delete old items
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [req.params.id]);

    // Update sales table
    await client.query(
      `UPDATE sales SET 
        customer_name=$1, customer_phone=$2, customer_address=$3, total_amount=$4, 
        discount=$5, delivery_charges=$6, net_amount=$7, paid_amount=$8, 
        balance_amount=$9, payment_type=$10, vehicle_id=$11, vehicle_id2=$12,
        vehicle_number=$13, vehicle_number2=$14, vehicle_ids=$15, items=$16,
        vehicle_type=$17
      WHERE id=$18`,
      [customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, JSON.stringify(items), vehicle_type || null, req.params.id]
    );

    // Insert new items and update stock
    for (const item of items) {
      const prodId = item.product_id || item.id;
      const prodName = item.product_name || item.name;
      const rate = parseFloat(item.rate || item.price) || 0;
      const parsedQty = parseFloat(item.qty) || 0;
      const subtotal = parsedQty * rate;

      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.params.id, prodId, prodName, parsedQty, rate, subtotal]
      );
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [parsedQty, prodId]);
    }

    // Update new customer balance
    const newBalanceAmt = parseFloat(balance_amount);
    if (oldSale && oldSale.customer_id && !isNaN(newBalanceAmt) && newBalanceAmt !== 0) {
      await client.query('UPDATE customers SET balance = balance + $1 WHERE id = $2', [newBalanceAmt, oldSale.customer_id]);
    }

    // Update new vehicle earnings
    if (vehicle_type && vehicleIds.length > 0) {
      const fareAmount = parseFloat(delivery_charges) || 0;
      const farePerVehicle = fareAmount / vehicleIds.length;
      for (const id of vehicleIds) {
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [farePerVehicle, id]
        );
      }
    }

    let customerBalance = 0;
    if (oldSale && oldSale.customer_id) {
      const custRes = await client.query('SELECT balance FROM customers WHERE id = $1', [oldSale.customer_id]);
      if (custRes.rows.length > 0) {
        customerBalance = parseFloat(custRes.rows[0].balance || 0);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, customer_balance: customerBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete a sale - Admin only
router.delete('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Access denied' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oldItems = await client.query('SELECT product_id, qty FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of oldItems.rows) {
      await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.qty, item.product_id]);
    }

    const oldSaleRes = await client.query('SELECT customer_id, balance_amount, vehicle_id, vehicle_id2, vehicle_ids, delivery_charges, vehicle_type FROM sales WHERE id = $1', [req.params.id]);
    const oldSale = oldSaleRes.rows[0];
    if (oldSale) {
      const oldBalanceAmt = parseFloat(oldSale.balance_amount);
      if (oldSale.customer_id && !isNaN(oldBalanceAmt) && oldBalanceAmt !== 0) {
        await client.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [oldBalanceAmt, oldSale.customer_id]);
      }

      if (oldSale.vehicle_type && oldSale.vehicle_type !== '') {
        let oldVehicleIds = [];
        if (oldSale.vehicle_ids) {
          try {
            oldVehicleIds = typeof oldSale.vehicle_ids === 'string' ? JSON.parse(oldSale.vehicle_ids) : oldSale.vehicle_ids;
          } catch (e) { }
        } else if (oldSale.vehicle_id) {
          oldVehicleIds = [oldSale.vehicle_id];
        }
        oldVehicleIds = oldVehicleIds.filter(id => !isNaN(id) && id > 0);

        if (oldVehicleIds.length > 0) {
          const oldFareAmount = parseFloat(oldSale.delivery_charges) || 0;
          const oldFarePerVehicle = oldFareAmount / oldVehicleIds.length;
          for (const id of oldVehicleIds) {
            await client.query(
              `UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2`,
              [oldFarePerVehicle, id]
            );
          }
        }
      }
    }

    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [req.params.id]);
    await client.query('DELETE FROM sales WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update a specific item in a sale (from Ledger) - Admin only
router.post('/update-item', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can edit ledger entries' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { sale_id, item_id, new_qty, new_rate } = req.body;

    const oldItem = await client.query('SELECT * FROM sale_items WHERE id = $1', [item_id]);
    if (oldItem.rows.length === 0) throw new Error('Item not found');
    const { qty: old_qty, subtotal: old_subtotal, product_id } = oldItem.rows[0];

    const n_qty = parseFloat(new_qty) || 0;
    const n_rate = parseFloat(new_rate) || 0;
    const new_subtotal = n_qty * n_rate;
    const subtotal_diff = new_subtotal - (parseFloat(old_subtotal) || 0);
    const qty_diff = n_qty - (parseFloat(old_qty) || 0);

    await client.query(
      'UPDATE sale_items SET qty = $1, rate = $2, subtotal = $3 WHERE id = $4',
      [n_qty, n_rate, new_subtotal, item_id]
    );

    await client.query(
      'UPDATE sales SET total_amount = total_amount + $1, net_amount = net_amount + $1, balance_amount = balance_amount + $1 WHERE id = $2',
      [subtotal_diff, sale_id]
    );

    const sale = await client.query('SELECT customer_id FROM sales WHERE id = $1', [sale_id]);
    const customer_id = sale.rows[0].customer_id;
    if (customer_id && !isNaN(subtotal_diff) && subtotal_diff !== 0) {
      await client.query(
        'UPDATE customers SET balance = balance + $1 WHERE id = $2',
        [subtotal_diff, customer_id]
      );
    }

    if (product_id) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [qty_diff, product_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ Process a Sale Return (Full or Partial) - FULLY FIXED (no refAmt)
router.post('/return', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read refund_amount from frontend
    const refundAmount = parseFloat(req.body.refund_amount) || 0;
    const { sale_id, items_to_return, refund_method, vehicle_id, vehicle_type, delivery_charges } = req.body;

    const sId = parseInt(sale_id);
    if (isNaN(sId)) throw new Error('Invalid Bill Number');

    // 1. Get sale details
    const saleRes = await client.query('SELECT * FROM sales WHERE id = $1', [sId]);
    if (saleRes.rows.length === 0) throw new Error('Sale not found');
    const sale = saleRes.rows[0];
    if (sale.status === 'Returned') throw new Error('This bill has already been fully returned');

    // 2. Identify items to return
    let items;
    if (items_to_return && Array.isArray(items_to_return) && items_to_return.length > 0) {
      items = items_to_return;
    } else {
      const itemsRes = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [sId]);
      items = itemsRes.rows;
    }

    let totalReturnedValue = 0;
    for (const item of items) {
      const prodId = item.product_id;
      const qty = parseFloat(item.return_qty || item.qty || 0);
      const rate = parseFloat(item.rate || 0);
      if (prodId && qty > 0) {
        await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [qty, prodId]);
        totalReturnedValue += (qty * rate);
      }
    }

    // Fetch vehicle numbers for return
    let vehicleIds = [];
    if (req.body.vehicle_ids) {
      vehicleIds = Array.isArray(req.body.vehicle_ids) ? req.body.vehicle_ids.map(Number) : [Number(req.body.vehicle_ids)];
    } else if (vehicle_id && vehicle_id !== '') {
      vehicleIds = [Number(vehicle_id)];
    }
    vehicleIds = vehicleIds.filter(id => !isNaN(id) && id > 0);

    let vehicleNumbers = [];
    if (vehicleIds.length > 0) {
      const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ');
      const vRes = await client.query(`SELECT vehicle_number FROM vehicles WHERE id IN (${placeholders})`, vehicleIds);
      vehicleNumbers = vRes.rows.map(r => r.vehicle_number);
    }

    const vNumber1 = (req.body.vehicle_type === 'Supplier' && req.body.vehicle_number) ? req.body.vehicle_number : (vehicleNumbers.join(', ') || null);
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    // 3. Create a NEW Sale record for the return (Separate Bill)
    const returnBillResult = await client.query(
      `INSERT INTO sales (
        sale_type, customer_id, customer_name, customer_phone, 
        net_amount, paid_amount, balance_amount, status, 
        payment_type, user_id, items, vehicle_id, vehicle_id2, vehicle_number, vehicle_number2, vehicle_ids, delivery_charges, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP) RETURNING id`,
      [
        sale.sale_type, sale.customer_id, sale.customer_name, sale.customer_phone,
        -totalReturnedValue, -refundAmount, -(totalReturnedValue - refundAmount),
        'Returned', refund_method || 'Cash', req.user.id,
        JSON.stringify(items.map(i => ({ ...i, quantity: i.return_qty || i.qty, name: i.product_name || i.name }))),
        vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, delivery_charges || 0
      ]
    );
    const newReturnId = returnBillResult.rows[0].id;

    // 3.5 Automatic Transport Earnings Update
    if (vehicleIds.length > 0 && (parseFloat(delivery_charges) || 0) > 0) {
      const fareAmount = parseFloat(delivery_charges) || 0;
      const farePerVehicle = fareAmount / vehicleIds.length;
      for (const id of vehicleIds) {
        await client.query(`UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`, [farePerVehicle, id]);
      }
    }

    // 4. Insert returned items into sale_items for the return bill (negative qty)
    for (const item of items) {
      const returnQty = -parseFloat(item.return_qty || item.qty || 0);
      const subtotal = returnQty * parseFloat(item.rate || 0);
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newReturnId, item.product_id, item.product_name || item.name, returnQty, parseFloat(item.rate || 0), subtotal]
      );
    }

    // 5. Update Original Sale status
    if (!items_to_return || items_to_return.length === 0) {
      await client.query('UPDATE sales SET status = $1 WHERE id = $2', ['Returned', sId]);
    } else {
      await client.query("UPDATE sales SET status = 'Partially Returned' WHERE id = $1", [sId]);
    }

    // 6. Adjust Customer Balance
    if (sale.customer_id) {
      const reduction = totalReturnedValue - refundAmount;
      if (reduction !== 0 && !isNaN(reduction)) {
        await client.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [reduction, sale.customer_id]);
      }
    }

    // 7. Record Expense for Refund – CHANGED expense_type so banks.js does NOT skip it
    if (refundAmount > 0) {
      await client.query(
        `INSERT INTO expenses (description, expense_type, amount, payment_type, user_id, module_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          `Sale Return Refund (Return Bill #${newReturnId}, Orig #${sId})`,
          'Sale Return Refund',   // ✅ was 'Sale Return' (skipped), now correct
          refundAmount,
          refund_method || 'Cash',
          req.user.id,
          sale.sale_type
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Stock returned and balance adjusted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Return Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Send Custom WhatsApp Message
router.post('/send-message', auth, async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'Recipient phone (to) and message body (body) are required' });
    }
    await sendWhatsAppMessage(to, body);
    res.json({ success: true, message: 'Message sent successfully via WhatsApp gateway' });
  } catch (err) {
    console.error('Send Custom WhatsApp Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send Custom WhatsApp Document (PDF)
router.post('/send-document', auth, async (req, res) => {
  try {
    const { to, document: docBase64, filename } = req.body;
    if (!to || !docBase64) {
      return res.status(400).json({ error: 'Recipient phone (to) and document (base64) are required' });
    }

    let cleanPhone = String(to).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0092')) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.substring(1);
    else if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = '92' + cleanPhone;

    let rawBase64 = docBase64;
    if (rawBase64.startsWith('data:')) {
      rawBase64 = rawBase64.split(',')[1];
    }
    if (!rawBase64) {
      return res.status(400).json({ error: 'Invalid base64 document data' });
    }

    const uniqueName = `ledger_${crypto.randomBytes(8).toString('hex')}.pdf`;
    const tempDir = path.join(__dirname, '..', 'public', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, uniqueName);
    fs.writeFileSync(tempFilePath, Buffer.from(rawBase64, 'base64'));

    setTimeout(() => {
      try { fs.unlinkSync(tempFilePath); } catch (e) { }
    }, 10 * 60 * 1000);

    const backendUrl = process.env.BACKEND_URL || 'https://erp-backend-3rf8.onrender.com';
    const fileUrl = `${backendUrl}/temp/${uniqueName}`;

    const token = process.env.WHATSAPP_TOKEN || '4722xwbvpu3mdq18';
    const instanceUrl = process.env.WHATSAPP_API_URL || 'https://api.ultramsg.com/instance174172/messages/chat';
    const docApiUrl = instanceUrl.replace(/\/messages\/chat(\/?)?$/, '/messages/document').replace(/\/chat(\/?)?$/, '/messages/document');

    const sendResult = await new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        token: token,
        to: cleanPhone,
        filename: filename || 'Ledger.pdf',
        document: fileUrl
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

      const httpreq = https.request(options, (httpsRes) => {
        let data = '';
        httpsRes.on('data', chunk => data += chunk);
        httpsRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ UltraMsg Document Response: ${JSON.stringify(parsed)}`);
            resolve(parsed);
          } catch (e) {
            console.error('UltraMsg raw response:', data);
            reject(new Error(`UltraMsg response parse error: ${data}`));
          }
        });
      });
      httpreq.on('error', reject);
      httpreq.write(postData);
      httpreq.end();
    });

    if (sendResult.sent === 'true' || sendResult.sent === true) {
      res.json({ success: true, message: 'Ledger sent successfully via WhatsApp' });
    } else {
      throw new Error(`UltraMsg rejected document: ${JSON.stringify(sendResult)}`);
    }
  } catch (err) {
    console.error('Send Custom WhatsApp Document Error:', err.message);
    res.status(500).json({ error: `Failed to send WhatsApp PDF: ${err.message}` });
  }
});

module.exports = router;