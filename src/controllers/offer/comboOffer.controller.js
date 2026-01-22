const comboOffer = require("../../models/offers/comboOffer.model");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

const getAllComboOffer = async (req, res) => {
  try {
    const { name, status } = req.query;
    const whereClause = {};

    if (name) {
      whereClause.name = {
        [Op.like]: `%${name}%`,
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await comboOffer.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const data = rows.map((item) => {
      const bannerImage = item.bannerImage
        ? `${baseUrl}${
            Array.isArray(item.bannerImage)
              ? item.bannerImage[0]
              : item.bannerImage
          }`
        : null;

      return {
        ...item.toJSON(),
        bannerImage,
      };
    });

    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching combo offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve combo offers",
    });
  }
};

const getComboOfferById = async (req, res) => {
  const { id } = req.params;

  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const offer = await comboOffer.findOne({ where: { id } });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Combo offer not found",
      });
    }

    const bannerImage = offer.bannerImage
      ? `${baseUrl}${
          Array.isArray(offer.bannerImage)
            ? offer.bannerImage[0]
            : offer.bannerImage
        }`
      : null;

    res.json({
      success: true,
      data: {
        ...offer.toJSON(),
        bannerImage,
      },
    });
  } catch (error) {
    console.error("Error fetching combo offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve combo offer",
    });
  }
};

const createComboOffer = async (req, res) => {
  const {
    name,
    Description,
    category,
    eligibleAmount,
    offerAmount,
    startDate,
    endDate,
    status,
  } = req.body;

  const bannerImage = req.files?.bannerImage?.[0]
    ? `${process.env.FILE_PATH}${req.files.bannerImage[0].filename}`
    : null;

  try {
    const newOffer = await comboOffer.create({
      name,
      Description,
      category,
      eligibleAmount,
      offerAmount,
      startDate,
      endDate,
      status,
      bannerImage,
    });

    res.json({
      success: true,
      message: "Combo offer created successfully",
      data: newOffer,
    });
  } catch (error) {
    console.error("Error creating combo offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create combo offer",
    });
  }
};

const updateComboOffer = async (req, res) => {
  const {
    id,
    name,
    Description,
    category,
    eligibleAmount,
    offerAmount,
    startDate,
    endDate,
    status,
  } = req.body;

  try {
    const existing = await comboOffer.findByPk(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Combo offer not found",
      });
    }

    let bannerImage = existing.bannerImage;

    if (req.files?.bannerImage?.[0]) {
      if (bannerImage) {
        const oldPath = path.join(__dirname, "..", bannerImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      bannerImage = `${process.env.FILE_PATH}${req.files.bannerImage[0].filename}`;
    }

    await comboOffer.update(
      {
        name,
        Description,
        category,
        eligibleAmount,
        offerAmount,
        startDate,
        endDate,
        status,
        bannerImage,
      },
      { where: { id } }
    );

    res.json({
      success: true,
      message: "Combo offer updated successfully",
    });
  } catch (error) {
    console.error("Error updating combo offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update combo offer",
    });
  }
};

const deleteComboOffer = async (req, res) => {
  const { id } = req.params;

  try {
    const offer = await comboOffer.findOne({ where: { id } });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Combo offer not found",
      });
    }

    if (offer.bannerImage) {
      const imgPath = path.join(__dirname, "..", offer.bannerImage);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await comboOffer.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Combo offer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting combo offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete combo offer",
    });
  }
};

module.exports = {
  getAllComboOffer,
  getComboOfferById,
  createComboOffer,
  updateComboOffer,
  deleteComboOffer,
};
