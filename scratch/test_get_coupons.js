require('dotenv').config();
const nectorController = require('../src/controllers/nectorController');

const req = {
  query: {
    page: 1,
    limit: 10
  }
};
const res = {
  json: (data) => {
    console.log("Response:", JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log("Status:", code);
    return res;
  }
};

nectorController.getCoupons(req, res);
