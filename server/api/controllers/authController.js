const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password, permissions) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, permissions',
      [name, email, password, JSON.stringify([])]
    );

    const user = newUserResult.rows[0];

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        module_type: user.module_type
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const user = userResult.rows[0];

    // Plain text comparison
    if (password !== user.password) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const getModuleType = (email, currentType) => {
      if (currentType) return currentType;
      const em = (email || '').toLowerCase();
      if (em.includes('wholesale')) return 'Wholesale';
      if (em.includes('retail1') || em.includes('retailsaller1')) return 'Retail 1';
      if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) return 'Retail 2';
      return null;
    };

    const finalModuleType = getModuleType(user.email, user.module_type);

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        module_type: finalModuleType
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '5 days' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            module_type: finalModuleType,
            permissions: user.permissions || [] 
          } 
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUser = async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, name, email, role, module_type, permissions, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (user) {
      const em = (user.email || '').toLowerCase();
      if (!user.module_type) {
        if (em.includes('wholesale')) user.module_type = 'Wholesale';
        else if (em.includes('retail1') || em.includes('retailsaller1')) user.module_type = 'Retail 1';
        else if (em.includes('retail2') || em.includes('retailseller2') || em.includes('wali2022')) user.module_type = 'Retail 2';
      }
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
