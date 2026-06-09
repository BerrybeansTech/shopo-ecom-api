require('dotenv').config();
const Coupon = require('../src/models/offers/coupon.model');
const NectorWebhookLogs = require('../src/models/nector/nectorWebhookLogs.model');

async function run() {
  try {
    console.log("=== Webhook Logs ===");
    const logs = await NectorWebhookLogs.findAll({ limit: 10, order: [['created_at', 'DESC']] });
    for (const log of logs) {
      console.log(`Log ID: ${log.id}, Event: ${log.event_name}, Processed: ${log.processed}`);
      console.log(`Payload:`, JSON.stringify(log.payload, null, 2));
      console.log('-----------------');
    }

    console.log("\n=== Coupons ===");
    const coupons = await Coupon.findAll({ limit: 10 });
    for (const coupon of coupons) {
      console.log(`Code: ${coupon.code}, Status: ${coupon.status}, Expire: ${coupon.expireAt}, Value: ${coupon.value}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
