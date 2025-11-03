const { sendOtp, verifyOtp } = require("../services/otp.service.js");

const sendUserOtp = async (req, res) => {
  try {
    const { type, identifier } = req.body;
    const result = await sendOtp({ type, identifier });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const verifyUserOtp = async (req, res) => {
  try {
    const { type, identifier, otp } = req.body;
    const result = await verifyOtp({ type, identifier, otp });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendUserOtp, verifyUserOtp };
