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
    if (customerId) whereClause.customerId = customerId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await CustomerAddress.findAndCountAll({
      where: whereClause,
      include: [{ model: Customer, attributes: ["id", "name", "email"] }],
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
    const address = await CustomerAddress.findOne({
      where: { id },
      include: [{ model: Customer, attributes: ["id", "name", "email"] }]
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
  const { customerId, address, city, state, country, postalCode } = req.body;

  try {
    const customerExists = await Customer.findByPk(customerId);
    if (!customerExists) {
      return res.status(400).json({ success: false, message: "Customer does not exist" });
    }

    const newAddress = await CustomerAddress.create({
      customerId,
      address,
      city,
      state,
      country,
      postalCode,
    });

    res.json({
      success: true,
      message: "Address created successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ success: false, message: "Failed to create address" });
  }
};


const updateAddress = async (req, res) => {
  const { id, address, city, state, country, postalCode, isDefault } = req.body;

  try {
    const existing = await CustomerAddress.findByPk(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    if (isDefault) {
      await CustomerAddress.update(
        { isDefault: false },
        { where: { customerId: existing.customerId } }
      );
    }

    await CustomerAddress.update(
      {
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
    const existing = await CustomerAddress.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    await CustomerAddress.destroy({ where: { id } });

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