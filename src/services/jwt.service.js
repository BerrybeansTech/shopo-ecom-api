const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access_secret_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret_key';

const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  ACCESS_SECRET,
  REFRESH_SECRET,
};