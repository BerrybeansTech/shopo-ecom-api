require('dotenv').config();
const AdminUser = require('../src/models/adminUser/AdminUser.model');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [admin, created] = await AdminUser.findOrCreate({
      where: { email: 'admin@store.com' },
      defaults: {
        name: 'Admin User',
        phone: '1234567890',
        password: hashedPassword
      }
    });

    if (!created) {
      admin.password = hashedPassword;
      await admin.save();
      console.log("Password updated for admin@store.com");
    } else {
      console.log("Admin user admin@store.com created successfully");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
