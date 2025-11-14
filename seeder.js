const sequelize = require('./src/config/db');
const Customers = require('./src/models/customer/customers.model');

async function seedDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync models
    await sequelize.sync();

    // Check if customer with id 1 exists
    const existingCustomer = await Customers.findByPk(1);
    if (!existingCustomer) {
      // Create a dummy customer
      await Customers.create({
        id: 1, // Force id to 1
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        password: 'password123', // In real app, hash this
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        country: 'USA',
        postalCode: '12345',
        wishList: [],
        status: 'active'
      });
      console.log('Dummy customer created with id 1.');
    } else {
      console.log('Customer with id 1 already exists.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
