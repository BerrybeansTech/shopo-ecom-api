const { Op } = require("sequelize");
const CustomerAddress = require("../../models/customer/customerAddress.model"); 
const Customer = require("../../models/customer/customers.model");

const getAllAddresses = async (req, res) => {
  try {
    const { city, state, country, customerId } = req.query;

    const whereClause = {};

    if (city) whereClause.city = { [Op.like]: `%${city}%` };
    if (state) whereClause.state = { [Op.like]: `%${state}%` };
    if (country) whereClause.country = { [Op.like]: `%${country}%` };
    // ✅ Use authenticated user ID if available
    const effectiveCustomerId = customerId || (req.user ? req.user.id : null);
    if (effectiveCustomerId) whereClause.customerId = effectiveCustomerId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await CustomerAddress.findAndCountAll({
      where: whereClause,
      include: [{ model: Customer, as: "customer", attributes: ["id", "name", "email"] }],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    console.error("Error retrieving addresses:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve addresses" });
  }
};

const getAddressById = async (req, res) => {
  const { id } = req.params;

  try {
    const whereClause = { id };
    if (req.user) whereClause.customerId = req.user.id;

    const address = await CustomerAddress.findOne({
      where: whereClause,
      include: [{ model: Customer, as: "customer", attributes: ["id", "name", "email"] }]
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true, data: address });
  } catch (error) {
    console.error("Error retrieving address:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve address" });
  }
};


const createAddress = async (req, res) => {
  try {
    const { customerId: bodyCustomerId, name, phone, address, city, state, country, postalCode, isDefault } = req.body;
    
    // ✅ Identify customer from body or authenticated user
    const customerId = bodyCustomerId || (req.user ? req.user.id : null);

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required"
      });
    }

    const customerExists = await Customer.findByPk(customerId);
    if (!customerExists) {
      return res.status(404).json({ success: false, message: "Customer does not exist" });
    }

    // ✅ If this is the first address, or isDefault is true, handle it
    const addressCount = await CustomerAddress.count({ where: { customerId } });
    const setAsDefault = isDefault || addressCount === 0;

    if (setAsDefault) {
      await CustomerAddress.update(
        { isDefault: false },
        { where: { customerId } }
      );
    }

    const newAddress = await CustomerAddress.create({
      customerId,
      name,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      isDefault: setAsDefault
    });

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create address",
      error: error.message 
    });
  }
};


const updateAddress = async (req, res) => {
  const { id, name, phone, address, city, state, country, postalCode, isDefault } = req.body;

  try {
    const whereClause = { id };
    if (req.user) whereClause.customerId = req.user.id;

    const existing = await CustomerAddress.findOne({ where: whereClause });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Address not found or unauthorized" });
    }

    if (isDefault) {
      await CustomerAddress.update(
        { isDefault: false },
        { where: { customerId: existing.customerId } }
      );
    }

    await CustomerAddress.update(
      {
        name,
        phone,
        address,
        city,
        state,
        country,
        postalCode,
        isDefault: !!isDefault,
      },
      { where: { id } }
    );

    res.json({ success: true, message: "Address updated successfully" });

  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, message: "Failed to update address" });
  }
};



const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const whereClause = { id };
    if (req.user) whereClause.customerId = req.user.id;

    const existing = await CustomerAddress.findOne({ where: whereClause });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Address not found or unauthorized" });
    }

    await CustomerAddress.destroy({ where: whereClause });

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Failed to delete address" });
  }
};

module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
};