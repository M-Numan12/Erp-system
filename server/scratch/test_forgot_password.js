delete process.env.DATABASE_URL;
const pool = require('../api/config/db');

async function testFlow() {
  console.log('🤖 Starting Forgot Password flow database simulation...');
  try {
    // 1. Fetch an existing user to use for testing
    console.log('Retrieving a test user...');
    const userRes = await pool.query('SELECT name, email, role, module_type FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('⚠️ No users found in the database. Please seed the database first.');
      return;
    }
    const user = userRes.rows[0];
    console.log(`👤 Found test user: Email: ${user.email}, Name: ${user.name}, Role: ${user.role}, ModuleType: ${user.module_type}`);

    // Determine the role string we'd enter
    const testRole = user.role || user.module_type || 'admin';
    const testEmail = user.email;
    const testName = user.name;

    // 2. Query matching logic
    console.log('\n🔍 Simulating user details match query...');
    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = LOWER($1) 
         AND LOWER(name) = LOWER($2) 
         AND (LOWER(role) = LOWER($3) OR LOWER(module_type) = LOWER($3))`,
      [testEmail, testName, testRole]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User match query failed! No matching record found.');
      return;
    }
    console.log('✅ User details match successfully!');

    // 3. Clear existing codes & Save new code
    console.log('\n💾 Generating code and writing to password_resets table...');
    const testCode = '999999';
    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [testEmail]);
    
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)',
      [testEmail.toLowerCase(), testCode, expiresAt]
    );
    console.log(`✅ Reset code ${testCode} saved successfully to password_resets table.`);

    // 4. Verify code query
    console.log('\n🔑 Simulating code verification query...');
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE LOWER(email) = LOWER($1) 
         AND code = $2 
         AND expires_at > NOW()`,
      [testEmail, testCode]
    );

    if (resetResult.rows.length === 0) {
      console.error('❌ Code verification query failed! No matching code or expired.');
      return;
    }
    console.log('✅ Code verified successfully!');

    // 5. Clean up code
    console.log('\n🧹 Cleaning up test reset code...');
    await pool.query('DELETE FROM password_resets WHERE LOWER(email) = LOWER($1)', [testEmail]);
    console.log('✅ Cleanup completed successfully!');

    console.log('\n🎉 ALL DATABASE QUERIES IN THE FLOW PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    await pool.end();
  }
}

testFlow();
