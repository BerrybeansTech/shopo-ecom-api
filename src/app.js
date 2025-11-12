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
const adminUserRoutes = require("./routes/adminUsers.routes.js");
const supportRoutes = require("./routes/support.routes.js");
const productRoutes = require("./routes/product.routes.js");
const orderRoutes = require("./routes/order.routes.js");
const inventoryRoutes = require("./routes/inventory.routes");
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
app.use("/admin-user", adminUserRoutes);
app.use("/product", productRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/order", orderRoutes);

app.use(errorHandler);

module.exports = app;