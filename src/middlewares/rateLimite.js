const rateLimit = require("express-rate-limit");

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  message: (req, res) => {
    return res
      .status(429)
      .json({ error: "Too many requests, please try again later." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiRateLimiter };
