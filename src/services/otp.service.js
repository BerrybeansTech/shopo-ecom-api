const crypto = require("crypto");
const nodemailer = require("nodemailer");
const redisClient = require("../config/redis.config");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendEmail = async (email, subject, message) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text: message,
  });
};

const sendOtp = async ({ type, identifier }) => {
  const otp = generateOTP();
  const key = `otp:${type}:${identifier}`;
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // Store for 5 minutes
  await redisClient.setEx(key, 300, hashedOtp);

  // await sendEmail(
  //   identifier,
  //   `Your OTP for ${type}`,
  //   `Your OTP for ${type} is: ${otp}. It is valid for 5 minutes.`
  // );

  return { success: true, otp: otp, message: "OTP sent successfully" };
};

const verifyOtp = async ({ type, identifier, otp }) => {
  const key = `otp:${type}:${identifier}`;
  const storedHash = await redisClient.get(key);

  if (!storedHash) {
    return { success: false, message: "OTP expired or not found" };
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  if (hashedOtp !== storedHash) {
    return { success: false, message: "Invalid OTP" };
  }

  await redisClient.del(key);

  const resetToken = crypto.randomUUID();
  const resetKey = `reset:${type}:${identifier}`;

  await redisClient.setEx(resetKey, 600, resetToken);

  return {
    success: true,
    message: "OTP verified successfully",
    resetToken,
  };
};

const validateOtpToken = async ({ type, identifier, token }) => {
  const resetKey = `reset:${type}:${identifier}`;
  const storedToken = await redisClient.get(resetKey);

  if (!storedToken || storedToken !== token) {
    return { success: false, message: "Invalid or expired reset token" };
  }

  await redisClient.del(resetKey);

  return { success: true };
};

module.exports = {sendOtp, verifyOtp, validateOtpToken}