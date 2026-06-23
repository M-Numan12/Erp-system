const pool = require('../config/db');

async function run() {
  try {
    const res = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN pool_ref_const AS rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='vehicles';
    `).catch(async () => {
      // If pool_ref_const is not direct, use a standard query
      return await pool.query(`
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='vehicles';
      `);
    });
    console.log("FOREIGN KEYS POINTING TO VEHICLES:", res.rows);

    const vehRows = await pool.query("SELECT COUNT(*) FROM vehicles;");
    console.log("TOTAL VEHICLES:", vehRows.rows[0].count);

    process.exit();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
