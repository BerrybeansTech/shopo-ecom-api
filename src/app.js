const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");

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
const blogRoutes = require("./routes/blog.routes");
const offerRoutes = require("./routes/offer.routes.js");
const paymentRoutes = require("./routes/payment.routes.js");
const bannerRoutes = require("./routes/banner.routes.js");
const nectorRoutes = require("./routes/nector.routes.js");


const app = express();

app.set('trust proxy', 1); // Trust the first proxy (Nginx)

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "https://rabbitnfinch.com",
  "https://www.rabbitnfinch.com",
  "https://admin.rabbitnfinch.com"
];

app.use(cors({
  origin: function(origin, callback) {

    console.log("🌍 Origin:", origin);

    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.rabbitnfinch.com')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

app.use(apiRateLimiter);

app.use("/customer", customerRoutes);
app.use("/otp", otpRoutes);
app.use("/support", supportRoutes);
app.use("/admin-user", adminUserRoutes);
app.use("/product", productRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/order", orderRoutes);
app.use("/blog", blogRoutes);
app.use("/offer", offerRoutes);
app.use("/payment", paymentRoutes);
app.use("/banner", bannerRoutes);
app.use("/nector", nectorRoutes);


app.use(errorHandler);

module.exports = app;