const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const { apiRateLimiter } = require("./middlewares/rateLimite.js");
const { errorHandler } = require("./middlewares/errorHandler.js");


require("./utils/relationship"); 

const customerRoutes = require("./routes/customers.routes.js");
const otpRoutes = require("./routes/otp.routes.js");
const supportRoutes = require("./routes/support.routes.js");
const categoriesRoutes = require("./routes/categorys.route.js");
const colorVariationRoutes = require("./routes/colorVariation.routes");
const sizeVariationRoutes = require("./routes/sizeVariation.routes");
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

// Routes
app.use("/customer", customerRoutes);
app.use("/otp", otpRoutes);
app.use("/support", supportRoutes);
app.use("/categories", categoriesRoutes);

app.use("/color-variations", colorVariationRoutes);
app.use("/size-variations", sizeVariationRoutes);

app.use(errorHandler);

module.exports = app;