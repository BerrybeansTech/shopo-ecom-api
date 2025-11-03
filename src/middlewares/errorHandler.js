const errorHandler = (err, req, res, next) => {
  console.error("error:", err);

  const status = err.status || err.code || 500;
  const message = err.message || "internal server error";

  res.status(status).json({ success: false, error: message });
};

module.exports = { errorHandler };
