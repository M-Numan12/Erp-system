const pool = require('../config/db');

// GET all users (Admin only)
exports.getUsers = async (req, res) => {
  try {
    // Include password in the SELECT query so admin can see it
    const result = await pool.query('SELECT id, name, email, password, role, module_type, permissions, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// POST create a new user (Admin only)
exports.createUser = async (req, res) => {
  const { name, email, password, role, module_type, permissions } = req.body;
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, module_type, permissions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, password, role, module_type, permissions',
      [name, email, password, role || 'user', module_type || null, JSON.stringify(permissions || [])]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// PUT update an existing user (Admin only)
exports.updateUser = async (req, res) => {
  const { name, email, password, role, module_type, permissions } = req.body;
  const { id } = req.params;

  try {
    let result;
    if (password) {
      result = await pool.query(
        'UPDATE users SET name = $1, email = $2, password = $3, role = $4, module_type = $5, permissions = $6 WHERE id = $7 RETURNING id, name, email, password, role, module_type, permissions',
        [name, email, password, role || 'user', module_type || null, JSON.stringify(permissions || []), id]
      );
    } else {
      result = await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, module_type = $4, permissions = $5 WHERE id = $6 RETURNING id, name, email, password, role, module_type, permissions',
        [name, email, role || 'user', module_type || null, JSON.stringify(permissions || []), id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// DELETE a user (Admin only)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
