require('dotenv').config();
const Customers = require('../src/models/customer/customers.model');

async function run() {
  try {
    const customers = await Customers.findAll({ limit: 10 });
    console.log(`Found ${customers.length} customers:`);
    for (const c of customers) {
      console.log(`ID: ${c.id}, UUID: ${c.customer_uuid}, Name: ${c.name}, Email: ${c.email}, Phone: ${c.phone}, Country: ${c.country}, NectorLeadID: ${c.nector_lead_id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
