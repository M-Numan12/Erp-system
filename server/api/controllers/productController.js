const pool = require('../config/db');

const isAdmin = (req) => req.user.role === 'admin';

// Get all products (with isolation)
exports.getProducts = async (req, res) => {
  try {
    const { type } = req.query; // e.g. ?type=Wholesale
    let query = 'SELECT * FROM products';
    let params = [];

    if (!isAdmin(req)) {
      query += ' WHERE module_type = $1';
      params.push(req.user.module_type || 'Retail 1');
    } else if (type) {
      query += ' WHERE module_type=$1';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { 
    console.error('Product Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Add a product
exports.addProduct = async (req, res) => {
  try {
    const { 
      name, brand, category, unit, price, cost_price, 
      stock_quantity, minimum_stock, description, image_url, module_type 
    } = req.body;
    
    const finalModule = isAdmin(req) ? (module_type || 'Wholesale') : (req.user.module_type || 'Retail 1');
    
    const result = await pool.query(
      `INSERT INTO products 
      (name, brand, category, unit, price, cost_price, stock_quantity, minimum_stock, description, image_url, module_type, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        name, brand, category, unit, 
        parseFloat(price) || 0, parseFloat(cost_price) || 0, 
        parseFloat(stock_quantity) || 0, parseFloat(minimum_stock) || 0, 
        description, image_url, finalModule, req.user.id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { 
    console.error('Product Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const { 
      name, brand, category, unit, price, cost_price, 
      stock_quantity, minimum_stock, description, image_url 
    } = req.body;

    const result = await pool.query(
      `UPDATE products SET 
        name=$1, brand=$2, category=$3, unit=$4, price=$5, cost_price=$6, 
        stock_quantity=$7, minimum_stock=$8, description=$9, image_url=$10 
      WHERE id=$11 AND (module_type=$12 OR $13) RETURNING *`,
      [
        name, brand, category, unit, 
        parseFloat(price) || 0, parseFloat(cost_price) || 0, 
        parseFloat(stock_quantity) || 0, parseFloat(minimum_stock) || 0, 
        description, image_url, 
        req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { 
    console.error('Product Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};

// Receive Stock (Stock Inbound)
exports.receiveStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { quantity, vehicle_number, module_type } = req.body;
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty)) {
      return res.status(400).json({ error: "Invalid quantity provided" });
    }
    
    // Update product stock
    const prodRes = await client.query(
      `UPDATE products SET stock_quantity = stock_quantity + $1 
       WHERE id=$2 AND (module_type=$3 OR $4) RETURNING *`,
      [parsedQty, req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]
    );

    if (prodRes.rows.length === 0) throw new Error("Product not found or unauthorized");

    await client.query('COMMIT');
    res.json(prodRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Stock Receive Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1 AND (module_type=$2 OR $3)', [req.params.id, req.user.module_type || 'Retail 1', isAdmin(req)]);
    res.json({ message: 'Product Deleted' });
  } catch (err) { 
    console.error('Product Controller Error:', err);
    res.status(500).json({ error: err.message }); 
  }
};
