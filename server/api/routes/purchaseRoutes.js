const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isAdmin = (req) => req.user.role === 'admin';

// Get all purchases/payments for all suppliers (Summary)
router.get('/ledger/all', auth, async (req, res) => {
  try {
    let query = `
      SELECT p.*, pr.name as product_name, pr.unit, pr.brand, s.name as supplier_name
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;
    let params = [];

    if (!isAdmin(req)) {
      query += ' WHERE p.module_type = $1';
      params.push(req.user.module_type || 'Retail 1');
    }

    query += ' ORDER BY p.purchase_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get purchases/receipts for a specific product
router.get('/product/:productId', auth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT p.*, pr.name as product_name, pr.unit, pr.brand, s.name as supplier_name
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.product_id = $1
    `;
    let params = [req.params.productId];
    let pIdx = 2;

    if (!isAdmin(req)) {
      query += ` AND p.module_type = $${pIdx++}`;
      params.push(req.user.module_type || 'Retail 1');
    } else if (type) {
      query += ` AND p.module_type = $${pIdx++}`;
      params.push(type);
    }

    query += ' ORDER BY p.purchase_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all purchases for a specific supplier (Ledger)
router.get('/supplier/:supplierId', auth, async (req, res) => {
  try {
    const { type, from, to } = req.query;
    let query = `
      SELECT p.*, pr.name as product_name, pr.unit, pr.brand 
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      WHERE p.supplier_id = $1
    `;
    let params = [req.params.supplierId];

    let pIdx = 2;
    if (!isAdmin(req)) {
      query += ` AND p.module_type = $${pIdx++}`;
      params.push(req.user.module_type || 'Retail 1');
    } else if (type) {
      query += ` AND p.module_type = $${pIdx++}`;
      params.push(type);
    }

    if (from && to) {
      query += ` AND p.purchase_date >= $${pIdx++} AND p.purchase_date <= $${pIdx++}`;
      params.push(from + " 00:00:00", to + " 23:59:59");
    }

    query += ' ORDER BY p.purchase_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new purchase (Receive Stock)
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      supplier_id, product_id, vehicle_number, quantity, rate,
      paid_amount, module_type, vehicle_id, delivery_charges, fare_status, gatepass,
      purchase_date
    } = req.body;

    const qty = parseFloat(quantity) || 0;
    const rt = parseFloat(rate) || 0;
    const paid = parseFloat(paid_amount) || 0;
    const fare = parseFloat(delivery_charges) || 0;
    const totalAmount = qty * rt;
    const balanceAmount = totalAmount - paid;

    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const pDate = purchase_date 
      ? (purchase_date.includes('T') || purchase_date.includes(' ') ? purchase_date : `${purchase_date} ${new Date().toTimeString().split(' ')[0]}`)
      : new Date();

    // Find vehicle_id if not provided but number is present
    let vId = vehicle_id;
    if (!vId && vehicle_number) {
      const vRes = await client.query('SELECT id FROM vehicles WHERE vehicle_number = $1 AND (is_deleted IS NOT TRUE) LIMIT 1', [vehicle_number]);
      if (vRes.rows.length > 0) vId = vRes.rows[0].id;
    }

    // 1. Insert Purchase Record
    const purchaseRes = await client.query(
      `INSERT INTO purchases 
      (supplier_id, product_id, vehicle_number, vehicle_id, quantity, rate, total_amount, paid_amount, balance_amount, delivery_charges, fare_payment_type, module_type, user_id, gatepass, purchase_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [supplier_id, product_id, vehicle_number, vId || null, qty, rt, totalAmount, paid, balanceAmount, fare, fare_status || 'Pending', finalModule, req.user.id, gatepass || null, pDate]
    );

    // 2. Update Product Stock
    await client.query(
      `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
      [qty, product_id]
    );

    // 3. Update Supplier Balance
    await client.query(
      `UPDATE suppliers SET balance = balance + $1 WHERE id = $2`,
      [balanceAmount, supplier_id]
    );

    // 4. Update Vehicle Earnings (if vehicle provided)
    if ((vId || vehicle_number) && fare > 0 && fare_status !== 'Free') {
      if (vId && fare_status === 'Pending') {
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [fare, vId]
        );
      }
      // Determine the correct expense_type based on vehicle ownership_type
      let expenseType = 'Supplier Vehicle';

      if (req.body.vehicle_type === 'Personal') {
        expenseType = 'Personal Vehicle';
      } else if (req.body.vehicle_type === 'External') {
        expenseType = 'Supplier Vehicle';
      } else if (vId) {
        const vOwnerRes = await client.query(
          'SELECT ownership_type FROM vehicles WHERE id = $1',
          [vId]
        );

        if (vOwnerRes.rows.length > 0) {
          const ownerType = String(vOwnerRes.rows[0].ownership_type || 'Personal').toLowerCase();
          if (ownerType === 'personal') {
            expenseType = 'Personal Vehicle';
          } else if (ownerType === 'rent' || ownerType === 'external') {
            expenseType = 'Supplier Vehicle';
          }
        }
      }

      // 5. Automatically record as an Expense with the correct type and link vehicle_id
      await client.query(
        `INSERT INTO expenses (description, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `Transport Fare: ${vehicle_number || 'Vehicle'}`,
          expenseType,
          'Transport',
          fare,
          pDate,
          JSON.stringify({ vehicle_id: vId, vehicle_number }),
          req.user.id,
          finalModule,
          fare_status === 'Paid' ? 'Cash' : 'Pending',
          vId || null
        ]
      );
    }

    await client.query('COMMIT');
    res.json(purchaseRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase Route Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Make Payment to Supplier
router.post('/payment', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { supplier_id, paid_amount, notes, module_type, payment_type, purchase_date } = req.body;

    const paid = parseFloat(paid_amount) || 0;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const pDate = purchase_date 
      ? (purchase_date.includes('T') || purchase_date.includes(' ') ? purchase_date : `${purchase_date} ${new Date().toTimeString().split(' ')[0]}`)
      : new Date();

    // 1. Insert Payment Record into Purchases (as a ledger entry)
    const paymentRes = await client.query(
      `INSERT INTO purchases 
      (supplier_id, product_id, vehicle_number, quantity, rate, total_amount, paid_amount, balance_amount, module_type, user_id, payment_type, purchase_date) 
      VALUES ($1, NULL, $2, 0, 0, 0, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [supplier_id, notes || 'Payment', paid, -paid, finalModule, req.user.id, payment_type || 'Cash', pDate]
    );

    // 2. Update Supplier Balance
    // NOTE: We paid them, so we owe them LESS. We subtract from balance.
    await client.query(
      `UPDATE suppliers SET balance = balance - $1 WHERE id = $2`,
      [paid, supplier_id]
    );

    await client.query('COMMIT');
    res.json(paymentRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Supplier Payment Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Post Manual Ledger Adjustment (Debit or Credit)
router.post('/adjustment', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { supplier_id, amount, notes, type, module_type } = req.body;
    const amt = parseFloat(amount) || 0;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    let totalAmount = 0;
    let paidAmount = 0;
    let balanceImpact = 0;

    if (type === 'Credit') {
      // Credit Adjustment: Increases what we owe (Credit increases Liability).
      totalAmount = amt;
      paidAmount = 0;
      balanceImpact = amt;
    } else {
      // Debit Adjustment: Decreases what we owe (like a payment).
      totalAmount = 0;
      paidAmount = amt;
      balanceImpact = -amt;
    }

    const desc = `[${type} Adjustment] ${notes || ''}`;

    // 1. Insert Adjustment into Purchases Table
    const adjustRes = await client.query(
      `INSERT INTO purchases 
      (supplier_id, product_id, vehicle_number, quantity, rate, total_amount, paid_amount, balance_amount, module_type, user_id, payment_type) 
      VALUES ($1, NULL, $2, 0, 0, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [supplier_id, desc, totalAmount, paidAmount, balanceImpact, finalModule, req.user.id, 'Manual Adjustment']
    );

    // 2. Update Supplier Running Balance
    await client.query(
      `UPDATE suppliers SET balance = balance + $1 WHERE id = $2`,
      [balanceImpact, supplier_id]
    );

    await client.query('COMMIT');
    res.json(adjustRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Supplier Adjustment Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Undo a purchase ledger entry (Purchase, Payment, Return, or Adjustment)
router.post('/ledger/undo', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can undo ledger entries' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { purchase_id } = req.body;
    if (!purchase_id) throw new Error('purchase_id is required');

    // 1. Get the purchase record
    const purchaseRes = await client.query('SELECT * FROM purchases WHERE id = $1 FOR UPDATE', [purchase_id]);
    if (purchaseRes.rows.length === 0) throw new Error('Purchase record not found');
    const purchase = purchaseRes.rows[0];

    // 2. Revert Supplier Balance
    if (purchase.supplier_id) {
      await client.query(
        'UPDATE suppliers SET balance = balance - $1 WHERE id = $2',
        [parseFloat(purchase.balance_amount) || 0, purchase.supplier_id]
      );
    }

    // 3. Revert Product Stock
    if (purchase.product_id && (parseFloat(purchase.quantity) || 0) !== 0) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [parseFloat(purchase.quantity) || 0, purchase.product_id]
      );
    }

    // 4. Revert Vehicle earnings and delete transport expense if applicable
    if (purchase.vehicle_id && parseFloat(purchase.delivery_charges) > 0) {
      if (purchase.fare_payment_type === 'Pending') {
        await client.query(
          'UPDATE vehicles SET total_earnings = total_earnings - $1 WHERE id = $2',
          [parseFloat(purchase.delivery_charges), purchase.vehicle_id]
        );
      }
      await client.query(
        "DELETE FROM expenses WHERE vehicle_id = $1 AND amount = $2 AND category = 'Transport'",
        [purchase.vehicle_id, parseFloat(purchase.delivery_charges)]
      );
    }

    // 5. Delete the purchase entry itself
    await client.query('DELETE FROM purchases WHERE id = $1', [purchase_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Transaction undone successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update a specific purchase entry (from Ledger)
router.post('/update-ledger-entry', auth, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can edit ledger entries' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { purchase_id, new_qty, new_rate } = req.body;

    // 1. Get original purchase details
    const oldRes = await client.query('SELECT * FROM purchases WHERE id = $1', [purchase_id]);
    if (oldRes.rows.length === 0) throw new Error('Purchase not found');
    const { quantity: old_qty, total_amount: old_total, supplier_id, product_id } = oldRes.rows[0];

    // 2. Calculate new totals
    const n_qty = parseFloat(new_qty) || 0;
    const n_rate = parseFloat(new_rate) || 0;
    const new_total = n_qty * n_rate;
    const total_diff = new_total - (parseFloat(old_total) || 0);
    const qty_diff = n_qty - (parseFloat(old_qty) || 0);

    // 3. Update purchases record
    await client.query(
      'UPDATE purchases SET quantity = $1, rate = $2, total_amount = $3, balance_amount = balance_amount + $4 WHERE id = $5',
      [n_qty, n_rate, new_total, total_diff, purchase_id]
    );

    // 4. Update Supplier Balance
    if (supplier_id) {
      await client.query(
        'UPDATE suppliers SET balance = balance + $1 WHERE id = $2',
        [total_diff, supplier_id]
      );
    }

    // 5. Adjust Product Stock
    if (product_id) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
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

// Process a Purchase Return
router.post('/return', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      supplier_id, product_id, vehicle_number, vehicle_id, quantity, rate,
      received_amount, module_type, delivery_charges, fare_status
    } = req.body;

    const qty = parseFloat(quantity) || 0;
    const rt = parseFloat(rate) || 0;
    const refund = parseFloat(received_amount) || 0;
    const fare = parseFloat(delivery_charges) || 0;

    const returnTotal = qty * rt;
    const balanceImpact = -(returnTotal - refund);

    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');

    let vId = vehicle_id;
    if (!vId && vehicle_number) {
      const vRes = await client.query('SELECT id FROM vehicles WHERE vehicle_number = $1 AND (is_deleted IS NOT TRUE) LIMIT 1', [vehicle_number]);
      if (vRes.rows.length > 0) vId = vRes.rows[0].id;
    }

    const returnRes = await client.query(
      `INSERT INTO purchases 
      (supplier_id, product_id, vehicle_number, vehicle_id, quantity, rate, total_amount, paid_amount, balance_amount, delivery_charges, fare_payment_type, module_type, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [supplier_id, product_id, vehicle_number, vId || null, -qty, rt, -returnTotal, -refund, balanceImpact, fare, fare_status || 'Pending', finalModule, req.user.id]
    );

    await client.query(
      `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
      [qty, product_id]
    );

    await client.query(
      `UPDATE suppliers SET balance = balance + $1 WHERE id = $2`,
      [balanceImpact, supplier_id]
    );

    if ((vId || vehicle_number) && fare > 0 && fare_status !== 'Free') {
      if (vId && fare_status === 'Pending') {
        await client.query(
          `UPDATE vehicles SET total_earnings = total_earnings + $1 WHERE id = $2`,
          [fare, vId]
        );
      }

      // Determine the correct expense_type based on vehicle ownership_type
      let returnExpenseType = 'Supplier Vehicle';

      if (req.body.vehicle_type === 'Personal') {
        returnExpenseType = 'Personal Vehicle';
      } else if (req.body.vehicle_type === 'External') {
        returnExpenseType = 'Supplier Vehicle';
      } else if (vId) {
        const vOwnerRes2 = await client.query(
          'SELECT ownership_type FROM vehicles WHERE id = $1',
          [vId]
        );

        if (
          vOwnerRes2.rows.length > 0 &&
          String(vOwnerRes2.rows[0].ownership_type || 'Personal').toLowerCase() === 'personal'
        ) {
          returnExpenseType = 'Personal Vehicle';
        }
      }

      await client.query(
        `INSERT INTO expenses (description, expense_type, category, amount, expense_date, notes, user_id, module_type, payment_type, vehicle_id) 
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9)`,
        [
          `Return Transport Fare: ${vehicle_number || 'Vehicle'}`,
          returnExpenseType,
          'Transport',
          fare,
          JSON.stringify({ vehicle_id: vId, vehicle_number }),
          req.user.id,
          finalModule,
          fare_status === 'Paid' ? 'Cash' : 'Pending',
          vId || null
        ]
      );
    }

    await client.query('COMMIT');
    res.json(returnRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase Return Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
