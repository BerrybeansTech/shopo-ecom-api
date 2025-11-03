const jwt = require('jsonwebtoken');
const { ACCESS_SECRET, REFRESH_SECRET, generateAccessToken } = require('../services/jwt.service');

const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    return generateAccessToken(decoded);
  } catch (err) {
    return null;
  }
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const refreshToken = req.cookies?.refreshToken;

    if (!token) {
      if (!refreshToken) {
        return res.status(401).json({ message: "Access and refresh tokens missing" });
      }

      return jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, refreshUser) => {
        if (err) {
          return res.status(401).json({ message: "Refresh token invalid or expired" });
        }
        
        const newAccessToken = generateAccessToken({
          id: refreshUser.id,
          name: refreshUser.name,
          email: refreshUser.email,
          phone: refreshUser.phone,
        });

        res.setHeader("Authorization", `Bearer ${newAccessToken}`);
        req.user = refreshUser;
        return next();
      });
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
        return next();
      }

      if (err.name === 'TokenExpiredError') {
        if (!refreshToken) {
          return res.status(401).json({ message: 'Refresh token missing' });
        }

        jwt.verify(refreshToken, REFRESH_SECRET, async (refreshErr, refreshUser) => {
          if (refreshErr) {
            return res.status(401).json({ message: 'Refresh token expired or invalid' });
          }

          const newAccessToken = generateAccessToken({
            id: refreshUser.id,
            name: refreshUser.name,
            email: refreshUser.email,
            phone: refreshUser.phone,
          });

          res.setHeader('Authorization', `Bearer ${newAccessToken}`);

          req.user = refreshUser;
          next();
        });
      } else {
        return res.status(401).json({ message: 'Invalid access token' });
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Internal authentication error' });
  }
};


module.exports = {authenticateToken, refreshAccessToken};