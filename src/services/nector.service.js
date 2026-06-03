const axios = require("axios");

const client = axios.create({
  baseURL: process.env.NECTOR_BASE_URL || "https://platform.nector.io",
  headers: {
    "x-apikey": process.env.NECTOR_API_KEY,
    "x-workspaceid": process.env.NECTOR_WORKSPACE_ID,
    "x-source": "web",
    "content-type": "application/json"
  }
});

module.exports = client;
