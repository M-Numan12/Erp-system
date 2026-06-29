const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'Numan1206@',
  host: 'localhost',
  port: 5432,
  database: 'erp_system'
});

async function testDeviceApproval() {
  console.log('🤖 Starting Device Approval query verification...');
  try {
    const testUserId = 2; // Wholesale Shop user
    const testIP = '1.1.1.1';
    const testUA = 'TestBrowser/1.0';
    const testDeviceName = 'Windows / TestBrowser';

    // 1. Clean up first
    await pool.query('DELETE FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3', [testUserId, testIP, testUA]);

    // 2. Insert new device as unapproved (false)
    console.log('Inserting unrecognized device (pending approval)...');
    await pool.query(
      `INSERT INTO user_devices (user_id, ip_address, user_agent, device_name, is_approved, last_login_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [testUserId, testIP, testUA, testDeviceName, false]
    );
    console.log('✅ Device inserted successfully.');

    // 3. Query check status
    console.log('Checking device approval status...');
    const checkRes = await pool.query(
      'SELECT * FROM user_devices WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3',
      [testUserId, testIP, testUA]
    );
    if (checkRes.rows.length === 0 || checkRes.rows[0].is_approved !== false) {
      console.error('❌ Check device approval status failed!');
      return;
    }
    console.log('✅ Device status is correctly verified as pending (is_approved = false).');

    // 4. Update status to approved (true)
    console.log('Updating device status to approved (is_approved = true)...');
    const updateRes = await pool.query(
      `UPDATE user_devices 
       SET is_approved = true 
       WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 
       RETURNING *`,
      [testUserId, testIP, testUA]
    );
    if (updateRes.rows.length === 0 || updateRes.rows[0].is_approved !== true) {
      console.error('❌ Approve device query failed!');
      return;
    }
    console.log('✅ Device approved successfully.');

    // 5. Delete device (reject)
    console.log('Rejecting/Deleting device...');
    const deleteRes = await pool.query(
      `DELETE FROM user_devices 
       WHERE user_id = $1 AND ip_address = $2 AND user_agent = $3 
       RETURNING *`,
      [testUserId, testIP, testUA]
    );
    if (deleteRes.rows.length === 0) {
      console.error('❌ Reject device query failed!');
      return;
    }
    console.log('✅ Device request rejected and deleted successfully.');

    console.log('\n🎉 ALL DEVICE APPROVAL QUERIES COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    await pool.end();
  }
}

testDeviceApproval();
