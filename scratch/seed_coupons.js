require('dotenv').config();
const Coupon = require('../src/models/offers/coupon.model');
const NectorWebhookLogs = require('../src/models/nector/nectorWebhookLogs.model');

async function seedCoupon(code, value, email, firstName, lastName) {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const [coupon, created] = await Coupon.findOrCreate({
    where: { code },
    defaults: {
      type: 'fixed',
      value: value,
      minCartAmount: 0.00, // No minimum cart amount as per Nector dump
      expireAt: futureDate,
      status: 'issued'
    }
  });

  if (!created) {
    await coupon.update({
      type: 'fixed',
      value: value,
      minCartAmount: 0.00,
      expireAt: futureDate,
      status: 'issued'
    });
    console.log(`Updated coupon '${code}'`);
  } else {
    console.log(`Created coupon '${code}'`);
  }

  // Insert mock webhook log for the coupon to simulate customer info linkage
  await NectorWebhookLogs.create({
    event_name: 'coupon_update',
    payload: {
      value: code,
      fiat_class: 'amount',
      fiat_value: value,
      minimumcart_amount: 0.00,
      expire: futureDate.toISOString(),
      status: 'issued',
      customer: {
        id: 'custom-USR_d5079a7b-2ad1-4e72-85f4-7ad838f76dc0',
        first_name: firstName,
        last_name: lastName,
        email: email
      }
    },
    processed: true
  });
  console.log(`Inserted mock webhook log for '${code}'`);
}

async function run() {
  try {
    // Seed the 3 coupons from the Nector payload dump
    await seedCoupon('necprihb06axnlm3mhg', 80.00, 'pjai2909an@gmail.com', 'ui', '');
    await seedCoupon('necpriwf7c2jcb9sq6e', 80.00, 'pjai2909an@gmail.com', 'ui', '');
    await seedCoupon('necprihlvaq1myjfql0', 129.00, 'pjai2909an@gmail.com', 'ui', '');

    console.log("All coupons seeded successfully!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    process.exit(0);
  }
}

run();

