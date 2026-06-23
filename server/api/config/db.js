const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'erp_db'
      }
);

pool.on('connect', (client) => {
  // Ensure every connection operates natively on Pakistan Time for date filters
  client.query("SET TIME ZONE 'Asia/Karachi'").catch(e => console.error("Timezone error", e));
  console.log('Connected to PostgreSQL Database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
