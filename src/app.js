const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require('cookie-parser');
// const healthRoutes = require("./routes/health.routes.js");
const { apiRateLimiter } = require("./middlewares/rateLimite.js");
const { errorHandler } = require("./middlewares/errorHandler.js");

const customerRoutes = require("./routes/customers.routes.js");
const otpRoutes = require("./routes/otp.routes.js");
const supportRoutes = require("./routes/support.routes.js");

// require('./utils/relationship.js');

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(morgan("dev"));
 app.use(cookieParser()); 


app.use(apiRateLimiter);

app.use("/customer", customerRoutes);
app.use("/otp", otpRoutes);
app.use("/support", supportRoutes);
// app.use("/health", healthRoutes);

app.use(errorHandler);

module.exports = app;
