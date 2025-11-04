const rateLimit = require("express-rate-limit");

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 5 requests per minute
  message: {
    error: "Too many requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiRateLimiter };
