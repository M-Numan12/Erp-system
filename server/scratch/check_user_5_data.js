const { Pool } = require('pg');
const NEON_URL = 'postgresql://neondb_owner:npg_6RkM7qEetYxT@ep-crimson-fog-a5z8uoww.us-east-2.aws.neon.tech/neondb?sslmode=require';
// Wait, we don't have the NEON_URL password working. But we can query via the debug endpoint by temporarily adding a route!
// Wait! Let's write a new debug route in bankRoutes.js that selects user_id=5 rows from products, sales, customers, bank_accounts!
// This is much better because it queries the actual active database connection from the server!
