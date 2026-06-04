const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { sendWhatsAppBill, sendWhatsAppMessage } = require('../utils/whatsapp');

const isAdmin = (req) => req.user.role === 'admin';

// Get all sales (with isolation)
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query; // e.g. ?type=Wholesale
    let query = 'SELECT * FROM sales';
    let params = [];

    if (!isAdmin(req)) {
      query += ' WHERE sale_type=$1';
      params.push(req.user.module_type || 'Retail 1');
    } else if (type) {
      query += ' WHERE sale_type=$1';
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
    
    const vNumber1 = vehicleNumbers.join(', ') || null;
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    const saleResult = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id, vehicle_id, vehicle_id2, vehicle_number, vehicle_number2, vehicle_ids, items, status, labour_group) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING id`,
      [finalCustomerId, customer_name, customer_phone || '', req.body.customer_address || '', total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, finalModule, req.user.id, vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, JSON.stringify(items), 'Completed', labour_group || null]
    );
    const saleId = saleResult.rows[0].id;

    // 2. Inventory Pre-check (Single Query Optimization)
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

    // 3. Insert items and update stock (Parallelized Execution within transaction)
    const operations = items.map(async (item) => {
      const prodId = item.product_id || item.id;
      const prodName = item.product_name || item.name;
      const rate = item.rate || item.price;

      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [saleId, prodId, prodName, item.qty, rate, item.subtotal]
      );

      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.qty, prodId]
      );
    });
    
    await Promise.all(operations);

    // 3. Update customer balance if it's a credit sale
    if (finalCustomerId && balance_amount !== 0) {
      await client.query(
        'UPDATE customers SET balance = balance + $1 WHERE id = $2',
        [balance_amount, finalCustomerId]
      );
    }

    // 4. Automatic Transport Earnings Update if vehicle is selected
    // 4. Automatic Transport Earnings Update if vehicle is selected
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

    // Fetch updated customer balance live inside the transaction
    let customerBalance = 0;
    if (finalCustomerId) {
      const custRes = await client.query('SELECT balance FROM customers WHERE id = $1', [finalCustomerId]);
      if (custRes.rows.length > 0) {
        customerBalance = parseFloat(custRes.rows[0].balance || 0);
      }
    }

    await client.query('COMMIT');

    // Trigger WhatsApp notification asynchronously in the background so it is 100% instant!
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
    const sale = await pool.query('SELECT * FROM sales WHERE id = $1 AND (user_id = $2 OR $3)', [req.params.id, req.user.id, isAdmin(req)]);
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
    
    // Decrease Customer Balance
    await client.query(
      'UPDATE customers SET balance = balance - $1 WHERE id = $2',
      [amount, customer_id]
    );

    // Get customer name
    const cust = await client.query('SELECT name FROM customers WHERE id=$1', [customer_id]);
    const custName = cust.rows[0]?.name || 'Unknown';

    // Insert Payment Record as a Sale with net_amount=0
    const insertRes = await client.query(
      `INSERT INTO sales 
      (customer_id, customer_name, total_amount, net_amount, paid_amount, balance_amount, payment_type, sale_type, user_id) 
      VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7) RETURNING id`,
      [customer_id, custName, amount, -amount, payment_reference ? `${payment_type || 'Cash'} (${payment_reference})` : (payment_type || 'Cash'), module_type, req.user.id]
    );

    await client.query('COMMIT');

    // After successful payment, send WhatsApp notifications
    // Fetch customer phone number
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
    
    // Send to customer if phone available
    if (custPhone) {
      await sendWhatsAppMessage(custPhone, paymentMessage);
    }
    // Send copy to admin
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

    // Fetch payment record
    const saleRes = await client.query('SELECT * FROM sales WHERE id = $1', [payment_id]);
    if (saleRes.rows.length === 0) throw new Error('Payment record not found');
    const sale = saleRes.rows[0];
    const { customer_id, paid_amount, payment_type, payment_reference } = sale;

    // Revert customer balance
    await client.query('UPDATE customers SET balance = balance + $1 WHERE id = $2', [paid_amount, customer_id]);

    // Delete the payment record
    await client.query('DELETE FROM sales WHERE id = $1', [payment_id]);

    await client.query('COMMIT');

    // Send WhatsApp notifications about reversal
    // Fetch customer phone
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

// Update a sale (Bill Edit)
router.put('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Access denied' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { 
      customer_name, customer_phone, customer_address, total_amount, discount, 
      delivery_charges, net_amount, paid_amount, balance_amount, 
      payment_type, items, vehicle_id 
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
    
    const vNumber1 = vehicleNumbers.join(', ') || null;
    const vId = vehicleIds[0] || null;
    const vId2 = vehicleIds[1] || null;
    const vNumber2 = vehicleNumbers[1] || null;
    const vehicleIdsJSON = vehicleIds.length > 0 ? JSON.stringify(vehicleIds) : null;

    // 1. Revert OLD stock
    const oldItems = await client.query('SELECT product_id, qty FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of oldItems.rows) {
      await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.qty, item.product_id]);
    }

    // 2. Revert OLD customer balance
    const oldSale = await client.query('SELECT customer_id, balance_amount FROM sales WHERE id = $1', [req.params.id]);
    if (oldSale.rows[0].customer_id && oldSale.rows[0].balance_amount !== 0) {
      await client.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [oldSale.rows[0].balance_amount, oldSale.rows[0].customer_id]);
    }

    // 3. Delete old items
    await client.query('DELETE FROM sale_items WHERE sale_id = $1', [req.params.id]);

    // 4. Update sales table
    await client.query(
      `UPDATE sales SET 
        customer_name=$1, customer_phone=$2, customer_address=$3, total_amount=$4, 
        discount=$5, delivery_charges=$6, net_amount=$7, paid_amount=$8, 
        balance_amount=$9, payment_type=$10, vehicle_id=$11, vehicle_id2=$12,
        vehicle_number=$13, vehicle_number2=$14, vehicle_ids=$15, items=$16
      WHERE id=$17`,
      [customer_name, customer_phone, customer_address, total_amount, discount, delivery_charges, net_amount, paid_amount, balance_amount, payment_type, vId, vId2, vNumber1, vNumber2, vehicleIdsJSON, JSON.stringify(items), req.params.id]
    );

    // 5. Insert NEW items and update stock
    for (const item of items) {
      const prodId = item.product_id || item.id;
      const prodName = item.product_name || item.name;
      const rate = item.rate || item.price;

      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.params.id, prodId, prodName, item.qty, rate, item.subtotal]
      );
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.qty, prodId]);
    }

    // 6. Update NEW customer balance
    if (oldSale.rows[0].customer_id && balance_amount !== 0) {
      await client.query('UPDATE customers SET balance = balance + $1 WHERE id = $2', [balance_amount, oldSale.rows[0].customer_id]);
    }

    // Fetch updated customer balance live inside transaction
    let customerBalance = 0;
    if (oldSale.rows[0].customer_id) {
      const custRes = await client.query('SELECT balance FROM customers WHERE id = $1', [oldSale.rows[0].customer_id]);
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

router.delete('/:id', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Access denied' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Revert stock before deleting
    const oldItems = await client.query('SELECT product_id, qty FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of oldItems.rows) {
      await client.query('UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.qty, item.product_id]);
    }

    // Revert customer balance
    const oldSale = await client.query('SELECT customer_id, balance_amount FROM sales WHERE id = $1', [req.params.id]);
    if (oldSale.rows[0].customer_id && oldSale.rows[0].balance_amount !== 0) {
      await client.query('UPDATE customers SET balance = balance - $1 WHERE id = $2', [oldSale.rows[0].balance_amount, oldSale.rows[0].customer_id]);
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

// Update a specific item in a sale (from Ledger)
router.post('/update-item', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can edit ledger entries' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { sale_id, item_id, new_qty, new_rate } = req.body;

    // 1. Get original item details
    const oldItem = await client.query('SELECT * FROM sale_items WHERE id = $1', [item_id]);
    if (oldItem.rows.length === 0) throw new Error('Item not found');
    const { qty: old_qty, subtotal: old_subtotal, product_id } = oldItem.rows[0];

    // 2. Calculate new subtotal
    const n_qty = parseFloat(new_qty);
    const n_rate = parseFloat(new_rate);
    const new_subtotal = n_qty * n_rate;
    const subtotal_diff = new_subtotal - parseFloat(old_subtotal);
    const qty_diff = n_qty - parseFloat(old_qty);

    // 3. Update sale_items
    await client.query(
      'UPDATE sale_items SET qty = $1, rate = $2, subtotal = $3 WHERE id = $4',
      [n_qty, n_rate, new_subtotal, item_id]
    );

    // 4. Update sales total and balance_amount
    await client.query(
      'UPDATE sales SET total_amount = total_amount + $1, net_amount = net_amount + $1, balance_amount = balance_amount + $1 WHERE id = $2',
      [subtotal_diff, sale_id]
    );

    // 5. Update Customer Balance
    const sale = await client.query('SELECT customer_id FROM sales WHERE id = $1', [sale_id]);
    const customer_id = sale.rows[0].customer_id;
    if (customer_id) {
      await client.query(
        'UPDATE customers SET balance = balance + $1 WHERE id = $2',
        [subtotal_diff, customer_id]
      );
    }

    // 6. Adjust Product Stock
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

// Process a Sale Return (Full or Partial)
router.post('/return', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { sale_id, items_to_return, refund_amount, refund_method, vehicle_id, vehicle_type, delivery_charges } = req.body;
    const sId = parseInt(sale_id);
    if (isNaN(sId)) throw new Error('Invalid Bill Number');

    // 1. Get sale details
    const saleRes = await client.query('SELECT * FROM sales WHERE id = $1', [sId]);
    if (saleRes.rows.length === 0) throw new Error('Sale not found');
    const sale = saleRes.rows[0];

    // Check if already fully returned
    if (sale.status === 'Returned') throw new Error('This bill has already been fully returned');

    // 0. Balance Check
    const refAmt = parseFloat(refund_amount || 0);
    if (refAmt > 0) {
      const method = refund_method || 'Cash';
      const searchPattern = method === 'Cash' ? 'Cash' : `%${method}%`;
      
      const finalModule = isAdmin(req) ? (sale.sale_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

      const salesSum = await client.query("SELECT SUM(paid_amount) FROM sales WHERE payment_type LIKE $1 AND sale_type = $2", [searchPattern, finalModule]);
      const expSum = await client.query("SELECT SUM(CASE WHEN expense_type = 'Admin Payment' THEN -amount ELSE amount END) FROM expenses WHERE payment_type LIKE $1 AND module_type = $2", [searchPattern, finalModule]);
      
      // Purchases table filtering by module_type
      let supPaid = 0;
      if (method === 'Cash') {
        const supSum = await client.query("SELECT SUM(paid_amount) FROM purchases WHERE module_type = $1", [finalModule]);
        supPaid = parseFloat(supSum.rows[0].sum || 0);
      } else {
        const supSum = await client.query("SELECT SUM(delivery_charges) FROM purchases WHERE fare_payment_type LIKE $1 AND module_type = $2", [searchPattern, finalModule]);
        supPaid = parseFloat(supSum.rows[0].sum || 0);
      }
      
      let openingBal = 0;
      if (method !== 'Cash') {
         // Bank accounts are usually per-user or shared. Filtering by user_id or bank_name.
         // Since we don't have module_type in bank_accounts, we check the account name.
         const bankRes = await client.query("SELECT SUM(opening_balance) FROM bank_accounts WHERE bank_name = $1", [method]);
         openingBal = parseFloat(bankRes.rows[0].sum || 0);
      } else {
         const bankRes = await client.query("SELECT SUM(opening_balance) FROM bank_accounts WHERE bank_name ILIKE '%Cash%'");
         openingBal = parseFloat(bankRes.rows[0].sum || 0);
      }
      
      const currentBalance = (parseFloat(salesSum.rows[0].sum || 0) + openingBal) - 
                             (parseFloat(expSum.rows[0].sum || 0) + supPaid);
                             
      if (refAmt > currentBalance) {
        throw new Error(`Insufficient Balance in ${method}. Available: Rs. ${currentBalance.toLocaleString()}`);
      }
    }

    // 2. Identify items to return
    let items;
    if (items_to_return && Array.isArray(items_to_return) && items_to_return.length > 0) {
      items = items_to_return;
    } else {
      // Full return
      const itemsRes = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [sId]);
      items = itemsRes.rows;
    }

    let totalReturnedValue = 0;

    for (const item of items) {
      const prodId = item.product_id;
      const qty = parseFloat(item.qty || 0);
      const rate = parseFloat(item.rate || 0);
      
      if (prodId && qty > 0) {
        // Restore stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [qty, prodId]
        );
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
    
    const vNumber1 = vehicleNumbers.join(', ') || null;
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
        sale.sale_type,
        sale.customer_id,
        sale.customer_name,
        sale.customer_phone,
        -totalReturnedValue,
        -refAmt,
        -(totalReturnedValue - refAmt),
        'Returned',
        refund_method || 'Cash',
        req.user.id,
        JSON.stringify(items.map(i => ({ ...i, quantity: i.return_qty || i.qty, name: i.product_name || i.name }))),
        vId,
        vId2,
        vNumber1,
        vNumber2,
        vehicleIdsJSON,
        delivery_charges || 0
      ]
    );
    const newReturnId = returnBillResult.rows[0].id;

    // 3.5 Automatic Transport Earnings Update
    if (vehicleIds.length > 0 && (parseFloat(delivery_charges) || 0) > 0) {
      const fareAmount = parseFloat(delivery_charges) || 0;
      const farePerVehicle = fareAmount / vehicleIds.length;
      for (const id of vehicleIds) {
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [farePerVehicle, id]
        );
      }
    }

    // 4. Insert returned items into sale_items for the return bill
    for (const item of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, qty, rate, subtotal) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newReturnId,
          item.product_id,
          item.product_name || item.name,
          -(item.return_qty || item.qty),
          item.rate,
          -(item.return_qty || item.qty) * item.rate
        ]
      );
    }

    // 5. Update Original Sale status if fully returned
    if (!items_to_return) {
      await client.query('UPDATE sales SET status = $1 WHERE id = $2', ['Returned', sId]);
    } else {
      await client.query("UPDATE sales SET status = 'Partially Returned' WHERE id = $1", [sId]);
    }

    // 5. Adjust Customer Balance
    if (sale.customer_id) {
      const reduction = totalReturnedValue - refAmt;
      if (reduction !== 0) {
        await client.query(
          'UPDATE customers SET balance = balance - $1 WHERE id = $2',
          [reduction, sale.customer_id]
        );
      }
    }

    // 6. Record Expense for Refund
    if (refAmt > 0) {
      await client.query(
        `INSERT INTO expenses (description, expense_type, amount, payment_type, user_id, module_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          `Sale Return Refund (Return Bill #${newReturnId}, Orig #${sId})`,
          'Sale Return',
          refAmt,
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

module.exports = router;
