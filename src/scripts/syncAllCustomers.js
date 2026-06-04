const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const crypto = require('crypto');
const { Op } = require('sequelize');

const sequelize = require('../config/db');
const Customers = require('../models/customer/customers.model');
const { syncCustomer } = require('../controllers/nectorController');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // Diagnostics
    const totalCount = await Customers.count();
    const syncedCount = await Customers.count({
      where: {
        nector_lead_id: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.not]: '' }
          ]
        }
      }
    });

    console.log('\n--- Database Diagnostics ---');
    console.log(`Total Customers in DB: ${totalCount}`);
    console.log(`Customers already synced: ${syncedCount}`);
    console.log(`Will force re-sync all ${totalCount} customers to apply correct ID format\n`);

    // Fetch ALL customers (force re-sync to fix any previously wrong prefix format)
    const allCustomers = await Customers.findAll();

    let successCount = 0;
    let failCount = 0;

    for (const customer of allCustomers) {
      // Generate customer_uuid if missing (legacy records before this column existed)
      if (!customer.customer_uuid) {
        customer.customer_uuid = `USR_${crypto.randomUUID()}`;
        await customer.save();
        console.log(`Generated UUID ${customer.customer_uuid} for legacy user: ${customer.email}`);
      }

      console.log(`Syncing ${customer.email} (${customer.customer_uuid})...`);
      const leadId = await syncCustomer(customer, 'customer_created');
      if (leadId && typeof leadId === 'string') {
        customer.nector_lead_id = leadId;
        await customer.save();
        console.log(`✅ Successfully synced ${customer.email}`);
        successCount++;
      } else {
        console.log(`❌ Failed to sync ${customer.email}`);
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n--- Sync Complete ---');
    console.log(`✅ Synced: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Total: ${allCustomers.length}`);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
