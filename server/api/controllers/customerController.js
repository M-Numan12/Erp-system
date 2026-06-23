const pool = require('../config/db');

const isAdmin = (req) => req.user.role === 'admin';

// Get all customers (with isolation)
exports.getCustomers = async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM customers';
    let params = [];

    if (isAdmin(req)) {
      if (type) {
        query += ' WHERE module_type = $1';
        params.push(type);
      }
    } else {
      query += ' WHERE module_type = $1';
      params.push(req.user.module_type || 'Retail 1');
    }

    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { 
    console.error('Customer Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Add a customer
exports.addCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, balance, module_type } = req.body;
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    const parsedBalance = parseFloat(balance);
    const finalBalance = isNaN(parsedBalance) ? 0 : parsedBalance;
    
    const result = await pool.query(
      'INSERT INTO customers (name,phone,email,address,balance,opening_balance,user_id,module_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, phone, email, address, finalBalance, finalBalance, req.user.id, finalModule]
    );
    res.json(result.rows[0]);
  } catch (err) { 
    console.error('Customer Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Update a customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, balance } = req.body;
    const parsedBalance = parseFloat(balance);
    const finalBalance = isNaN(parsedBalance) ? 0 : parsedBalance;

    const result = await pool.query(
      'UPDATE customers SET name=$1,phone=$2,email=$3,address=$4,balance=$5 WHERE id=$6 AND (module_type=$7 OR $8) RETURNING *',
      [name, phone, email, address, finalBalance, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );
    res.json(result.rows[0]);
  } catch (err) { 
    console.error('Customer Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Deleted' });
  } catch (err) { 
    console.error('Customer Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};
