const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_6RkM7qEetYxT@ep-crimson-fog-a5z8uoww.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const columnsRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bank_accounts'
        `);
        console.log("COLUMNS:", columnsRes.rows);

        const res = await pool.query("SELECT id, bank_name, account_title, account_number, opening_balance, module_type, current_balance FROM bank_accounts ORDER BY id ASC");
        console.log("ACCOUNTS ROWS:", res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
