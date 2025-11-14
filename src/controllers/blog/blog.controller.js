const blog = require("../../models/blog/blog.model");
const path = require("path");
const fs = require("fs");
const { Op, literal } = require("sequelize");

const getAllBlog = async (req, res) => {
  try {
    const { title } = req.query;
    const whereClause = {};
    const andConditions = [];

    if (title) {
      whereClause.title = {
        [Op.like]: `%${title}%`,
      };
    }

    if (andConditions.length > 0) {
      whereClause[Op.and] = andConditions;
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: blogs } = await blog.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const updatedBlogs = blogs.map((t) => {
      const featuredImage = t.featuredImage
        ? `${baseUrl}${
            Array.isArray(t.featuredImage)
              ? t.featuredImage[0]
              : t.featuredImage
          }`
        : null;

      const bannerImage = t.bannerImage
        ? `${baseUrl}${
            Array.isArray(t.bannerImage) ? t.bannerImage[0] : t.bannerImage
          }`
        : null;

      return {
        ...t.toJSON(),
        featuredImage,
        bannerImage,
      };
    });

    res.json({
      success: true,
      data: updatedBlogs,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve blogs",
    });
  }
};

const getBlogById = async (req, res) => {
  const { id } = req.params;

  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const t = await blog.findOne({ where: { id } });

    if (!t) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    const featuredImage = t.featuredImage
      ? `${baseUrl}${
          Array.isArray(t.featuredImage) ? t.featuredImage[0] : t.featuredImage
        }`
      : null;

    const bannerImage = t.bannerImage
      ? `${baseUrl}${
          Array.isArray(t.bannerImage) ? t.bannerImage[0] : t.bannerImage
        }`
      : null;

    res.json({
      success: true,
      data: {
        ...t.toJSON(),
        featuredImage,
        bannerImage,
      },
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve blog by id",
    });
  }
};

const createBlog = async (req, res) => {
  const { content, metaTitle, metaDescription, title, shortDescription, slug } =
    req.body;

  // const imagePaths = req.file ? [`${process.env.FILE_PATH}${req.file.filename}`] : [];

  const featuredImage = req.files?.featuredImage?.[0]
    ? `${process.env.FILE_PATH}${req.files.featuredImage[0].filename}`
    : null;

  const bannerImage = req.files?.bannerImage?.[0]
    ? `${process.env.FILE_PATH}${req.files.bannerImage[0].filename}`
    : [];

  try {
    const newBlog = await blog.create({
      content,
      featuredImage: featuredImage,
      bannerImage: bannerImage,
      title,
      shortDescription,
      slug,
      metaTitle,
      metaDescription,
    });

    res.json({
      success: true,
      message: "blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create blog",
    });
  }
};

const updateBlog = async (req, res) => {
  const {
    id,
    content,
    metaTitle,
    metaDescription,
    title,
    shortDescription,
    slug,
    status,
  } = req.body;

  try {
    const existing = await blog.findByPk(id);

    if (!existing) {
      return res.status(404).json({ message: "Blog not found" });
    }

    let featuredImage = existing.featuredImage;
    let bannerImage = existing.bannerImage;

    if (req.files?.featuredImage?.[0]) {
      if (featuredImage) {
        const oldPath = path.join(__dirname, "..", featuredImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      featuredImage = `${process.env.FILE_PATH}${req.files.featuredImage[0].filename}`;
    }

    if (req.files?.bannerImage?.[0]) {
      if (bannerImage) {
        const oldPath = path.join(__dirname, "..", bannerImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      bannerImage = `${process.env.FILE_PATH}${req.files.bannerImage[0].filename}`;
    }

    await blog.update(
      {
        content,
        metaTitle,
        metaDescription,
        title,
        shortDescription,
        slug,
        status,
      },
      { where: { id } }
    );

    res.json({ success: true, message: "Blog updated successfully" });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({ success: false, message: "Failed to update blog" });
  }
};

const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blogData = await blog.findOne({ where: { id } });

    if (!blogData) {
      return res
        .status(404)
        .json({ success: false, message: "blog not found" });
    }

    if (Array.isArray(blogData.image)) {
      blogData.image.forEach((imgPath) => {
        const fullPath = path.join(__dirname, "..", imgPath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`Failed to delete file: ${fullPath}`, err);
        });
      });
    }

    await blog.destroy({ where: { id } });

    res.json({
      success: true,
      message: "blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete blog",
    });
  }
};

module.exports = {
  getAllBlog,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
