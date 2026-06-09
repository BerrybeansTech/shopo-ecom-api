const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const crypto = require('crypto');
const { Op } = require('sequelize');

const sequelize = require('../config/db');
const Customers = require('../models/customer/customers.model');
const NectorLogs = require('../models/nector/nectorLogs.model');
const NectorWebhookLogs = require('../models/nector/nectorWebhookLogs.model');
const { syncCustomer, getLeadToken } = require('../controllers/nectorController');
const axiosInstance = require('../services/nector.service');

// Helper to mask secrets
function maskString(str) {
  if (!str) return 'NOT_CONFIGURED';
  if (str.length <= 8) return '********';
  return str.substring(0, 4) + '...' + str.substring(str.length - 4);
}

async function testNector() {
  console.log('=== NECTOR REFERRAL INTEGRATION TEST ===\n');

  // 1. Env check
  console.log('1. Checking environment variables:');
  console.log(`- NECTOR_API_KEY: ${maskString(process.env.NECTOR_API_KEY)}`);
  console.log(`- NECTOR_WORKSPACE_ID: ${process.env.NECTOR_WORKSPACE_ID || 'NOT_CONFIGURED'}`);
  console.log(`- NECTOR_SIGNING_SECRET: ${maskString(process.env.NECTOR_SIGNING_SECRET)}`);
  console.log(`- NECTOR_WEBHOOK_SECRET: ${maskString(process.env.NECTOR_WEBHOOK_SECRET)}`);
  console.log(`- NECTOR_WEBHOOK_ID: ${maskString(process.env.NECTOR_WEBHOOK_ID)}`);
  console.log(`- NECTOR_BASE_URL: ${process.env.NECTOR_BASE_URL || 'https://platform.nector.io'}`);
  console.log('');

  try {
    // 2. DB connection check
    await sequelize.authenticate();
    console.log('✅ 2. Connected to database successfully.');

    // 3. Create dummy test customer
    const testEmail = `test-nector-${Date.now()}@example.com`;
    console.log(`\n3. Creating dummy test customer: ${testEmail}`);
    const dummyUser = await Customers.create({
      name: 'Nector Test User',
      email: testEmail,
      phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'testpassword123',
      loginType: 'local',
      country: 'India',
      status: 'active'
    });

    console.log(`- Generated customer_uuid: ${dummyUser.customer_uuid}`);

    // 4. Test Customer Webhook Sync
    console.log('\n4. Syncing dummy customer with Nector via syncCustomer()...');
    const leadId = await syncCustomer(dummyUser, 'customer_created');

    if (leadId) {
      console.log(`✅ Customer synced. Received Nector lead_id: ${leadId}`);
      dummyUser.nector_lead_id = leadId;
      await dummyUser.save();
    } else {
      console.log('❌ Customer sync failed. See error output above.');
    }

    // 5. Test Lead Token API manually
    console.log('\n5. Generating Lead Token for the frontend SDK...');
    const timestamp = Math.floor(Date.now() / 1000);
    const nectorCustomerId = `custom-${dummyUser.customer_uuid}`;
    const payloadStr = `${nectorCustomerId}:${timestamp}`;

    const digest = crypto
      .createHmac('sha256', process.env.NECTOR_SIGNING_SECRET || '')
      .update(payloadStr)
      .digest('hex');

    console.log(`- Prepared Lead Token Query parameters:`);
    console.log(`  - customer_id: ${nectorCustomerId}`);
    console.log(`  - x-timestamp: ${timestamp}`);
    console.log(`  - x-leaddigest: ${digest}`);

    try {
      const response = await axiosInstance.get('/api/v2/merchant/leads/random-id', {
        params: {
          customer_id: nectorCustomerId
        },
        headers: {
          "x-timestamp": timestamp,
          "x-leaddigest": digest
        }
      });
      console.log('✅ Lead Token generated successfully!');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (err) {
      const errorData = err.response?.data || { message: err.message };
      console.error('❌ Lead Token request failed:', JSON.stringify(errorData, null, 2));
    }

    // 6. Clean up dummy customer
    console.log(`\n6. Cleaning up dummy customer...`);
    await dummyUser.destroy();
    console.log('✅ Dummy customer removed from database.');

    // 7. Show recent logs
    console.log('\n7. Recent Nector logs from nector_logs table:');
    const recentLogs = await NectorLogs.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    if (recentLogs.length === 0) {
      console.log('(No logs found in nector_logs table)');
    } else {
      recentLogs.forEach(log => {
        console.log(`- [${log.createdAt.toISOString()}] Event: ${log.event_type}, Status: ${log.status}`);
        console.log(`  Payload: ${JSON.stringify(log.payload)}`);
        console.log(`  Response: ${JSON.stringify(log.response)}`);
      });
    }

    console.log('\n8. Recent Nector webhooks processed from nector_webhook_logs table:');
    const recentWebhookLogs = await NectorWebhookLogs.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    if (recentWebhookLogs.length === 0) {
      console.log('(No logs found in nector_webhook_logs table)');
    } else {
      recentWebhookLogs.forEach(log => {
        console.log(`- [${log.created_at}] Event: ${log.event_name}, Processed: ${log.processed}`);
        console.log(`  Payload: ${JSON.stringify(log.payload)}`);
      });
    }

  } catch (err) {
    console.error('\n❌ Test execution failed with error:', err);
  } finally {
    await sequelize.close();
    console.log('\n=== TEST COMPLETED ===');
  }
}

testNector();
