const Banner = require("../../models/banner/banner.model");
const path = require("path");
const fs = require("fs");

const formatBannerResponse = (banner, req) => {
  if (!banner) return null;
  const data = banner.toJSON ? banner.toJSON() : { ...banner };
  const host = req.get("host");
  const protocol = host && host.includes("localhost") ? req.protocol : "https";
  const baseUrl = `${protocol}://${host}/`;

  if (data.image) {
    data.image = `${baseUrl}${data.image.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`;
  }
  if (data.mobileImage) {
    data.mobileImage = `${baseUrl}${data.mobileImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`;
  }
  return data;
};

exports.createBanner = async (req, res) => {
  try {
    let imagePath = null;
    let mobileImagePath = null;

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const file = req.files.image[0];
        imagePath = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`;
      }
      if (req.files.mobileImage && req.files.mobileImage[0]) {
        const file = req.files.mobileImage[0];
        mobileImagePath = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`;
      }
    }

    // Intercept single banner creation with image and/or mobileImage
    if (req.files && (req.files.image || req.files.mobileImage)) {
      const { title, subtitle, link, buttonText, displayOrder, isActive } = req.body;
      const commonIsActive = isActive !== undefined ? isActive === "true" || isActive === true : true;

      if (!imagePath) {
        return res.status(400).json({
          success: false,
          message: "Desktop banner image is required",
        });
      }

      const banner = await Banner.create({
        title: title ? title.trim() : null,
        subtitle: subtitle ? subtitle.trim() : null,
        image: imagePath,
        mobileImage: mobileImagePath,
        link: link ? link.trim() : null,
        buttonText: buttonText ? buttonText.trim() : null,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 1,
        isActive: commonIsActive,
      });

      return res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: formatBannerResponse(banner, req),
      });
    }

    let files = [];
    if (req.files) {
      if (req.files.images) files = [...files, ...req.files.images];
      if (req.files.image) files = [...files, ...req.files.image];
    } else if (req.file) {
      files.push(req.file);
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one banner image is required",
      });
    }

    const createdBanners = [];

    // Case A: Frontend sends `bannersData` as a JSON string array matching uploaded files
    if (req.body.bannersData) {
      let bannersMeta = [];
      try {
        bannersMeta = JSON.parse(req.body.bannersData);
        if (!Array.isArray(bannersMeta)) bannersMeta = [bannersMeta];
      } catch (e) {
        console.warn("Invalid bannersData JSON:", req.body.bannersData);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = bannersMeta[i] || {};
        const imagePath = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`;

        const banner = await Banner.create({
          title: meta.title ? meta.title.trim() : null,
          subtitle: meta.subtitle ? meta.subtitle.trim() : null,
          image: imagePath,
          link: meta.link ? meta.link.trim() : null,
          displayOrder: meta.displayOrder ? parseInt(meta.displayOrder, 10) : i + 1,
          isActive: meta.isActive !== undefined ? meta.isActive : true,
        });
        createdBanners.push(formatBannerResponse(banner, req));
      }
    } 
    // Case B: Frontend sends common fields (displayOrders, titles, subtitles, links)
    else {
      const { displayOrders, titles, subtitles, links, isActive } = req.body;
      const commonIsActive = isActive !== undefined ? isActive === "true" || isActive === true : true;

      let orderArr = [];
      if (displayOrders) {
        orderArr = Array.isArray(displayOrders) ? displayOrders : displayOrders.split(",");
      }

      let titleArr = [];
      if (titles) {
        titleArr = Array.isArray(titles) ? titles : titles.split(",");
      }

      let subtitleArr = [];
      if (subtitles) {
        subtitleArr = Array.isArray(subtitles) ? subtitles : subtitles.split(",");
      }

      let linkArr = [];
      if (links) {
        linkArr = Array.isArray(links) ? links : links.split(",");
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imagePath = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`;

        const banner = await Banner.create({
          title: titleArr[i] ? titleArr[i].trim() : req.body.title ? req.body.title.trim() : null,
          subtitle: subtitleArr[i] ? subtitleArr[i].trim() : req.body.subtitle ? req.body.subtitle.trim() : null,
          image: imagePath,
          link: linkArr[i] ? linkArr[i].trim() : req.body.link ? req.body.link.trim() : null,
          displayOrder: orderArr[i] ? parseInt(orderArr[i], 10) : req.body.displayOrder ? parseInt(req.body.displayOrder, 10) : i + 1,
          isActive: commonIsActive,
        });
        createdBanners.push(formatBannerResponse(banner, req));
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdBanners.length} banner(s) created successfully`,
      data: createdBanners.length === 1 ? createdBanners[0] : createdBanners,
    });
  } catch (error) {
    console.error("Create Banner Error:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating banner(s)",
    });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const { isActive } = req.query;
    const whereClause = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true" || isActive === true;
    }

    const banners = await Banner.findAll({
      where: whereClause,
      order: [["displayOrder", "ASC"]],
    });

    const formattedBanners = banners.map((banner) => formatBannerResponse(banner, req));

    res.status(200).json({
      success: true,
      data: formattedBanners,
    });
  } catch (error) {
    console.error("Get All Banners Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching banners",
    });
  }
};

exports.getActiveBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { isActive: true },
      order: [["displayOrder", "ASC"]],
    });

    const formattedBanners = banners.map((banner) => formatBannerResponse(banner, req));

    res.status(200).json({
      success: true,
      data: formattedBanners,
    });
  } catch (error) {
    console.error("Get Active Banners Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching active banners",
    });
  }
};

exports.getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID format" });
    }

    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    res.status(200).json({
      success: true,
      data: formatBannerResponse(banner, req),
    });
  } catch (error) {
    console.error("Get Banner By Id Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching banner",
    });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, link, buttonText, displayOrder, isActive } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID format" });
    }

    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (title !== undefined) banner.title = title ? title.trim() : null;
    if (subtitle !== undefined) banner.subtitle = subtitle ? subtitle.trim() : null;
    if (link !== undefined) banner.link = link ? link.trim() : null;
    if (buttonText !== undefined) banner.buttonText = buttonText ? buttonText.trim() : null;
    if (displayOrder !== undefined) banner.displayOrder = parseInt(displayOrder, 10);
    if (isActive !== undefined) banner.isActive = isActive === "true" || isActive === true;

    // Handle new image/mobileImage upload
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const newFile = req.files.image[0];
        
        // Remove old image file from filesystem
        if (banner.image) {
          const oldImagePath = path.join(__dirname, "../../../uploads", banner.image.replace(/^uploads[\/\\]/, ""));
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
            } catch (err) {
              console.warn("Failed to delete old banner image:", oldImagePath);
            }
          }
        }

        banner.image = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${newFile.filename.replace(/[\\\[\]"]/g, "")}`;
      }

      if (req.files.mobileImage && req.files.mobileImage[0]) {
        const newFile = req.files.mobileImage[0];
        
        // Remove old mobile image file from filesystem
        if (banner.mobileImage) {
          const oldImagePath = path.join(__dirname, "../../../uploads", banner.mobileImage.replace(/^uploads[\/\\]/, ""));
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
            } catch (err) {
              console.warn("Failed to delete old mobile banner image:", oldImagePath);
            }
          }
        }

        banner.mobileImage = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${newFile.filename.replace(/[\\\[\]"]/g, "")}`;
      }
    } else if (req.file) {
      // Fallback for single file upload
      const newFile = req.file;
      if (banner.image) {
        const oldImagePath = path.join(__dirname, "../../../uploads", banner.image.replace(/^uploads[\/\\]/, ""));
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.warn("Failed to delete old banner image:", oldImagePath);
          }
        }
      }
      banner.image = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${newFile.filename.replace(/[\\\[\]"]/g, "")}`;
    }

    await banner.save();

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: formatBannerResponse(banner, req),
    });
  } catch (error) {
    console.error("Update Banner Error:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating banner",
    });
  }
};

exports.updateBannerOrders = async (req, res) => {
  try {
    const { banners } = req.body;

    if (!banners || !Array.isArray(banners)) {
      return res.status(400).json({
        success: false,
        message: "An array of banners with id and displayOrder is required",
      });
    }

    for (const item of banners) {
      if (item.id && item.displayOrder !== undefined) {
        await Banner.update(
          { displayOrder: parseInt(item.displayOrder, 10) },
          { where: { id: item.id } }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Banner display orders updated successfully",
    });
  } catch (error) {
    console.error("Update Banner Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating banner orders",
    });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid banner ID format" });
    }

    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Remove image file from filesystem
    if (banner.image) {
      const imagePath = path.join(__dirname, "../../../uploads", banner.image.replace(/^uploads[\/\\]/, ""));
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.warn("Failed to delete banner image:", imagePath);
        }
      }
    }

    // Remove mobile image file from filesystem
    if (banner.mobileImage) {
      const mobileImagePath = path.join(__dirname, "../../../uploads", banner.mobileImage.replace(/^uploads[\/\\]/, ""));
      if (fs.existsSync(mobileImagePath)) {
        try {
          fs.unlinkSync(mobileImagePath);
        } catch (err) {
          console.warn("Failed to delete mobile banner image:", mobileImagePath);
        }
      }
    }

    await banner.destroy();

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete Banner Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while deleting banner",
    });
  }
};
