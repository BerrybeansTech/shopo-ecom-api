const dotenv = require('dotenv')
dotenv.config()

const express = require('express');


const app = require("./app.js");
const db = require("./config/db.js");

const PORT = process.env.PORT || 3000;

  app.use(express.urlencoded({extended: true}));
  app.use(express.json());
  app.set('view engine', 'pug');


async function startServer() {
  try {
    await db.authenticate();
    console.log("DB connected");

    await db.sync({ alter: false });
    console.log("Models synced");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
