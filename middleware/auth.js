const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

const auth = (req, res, next) => {
  let JWT_SECRET;
  try {
    JWT_SECRET = getJwtSecret();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured on the server.'
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

module.exports = { auth };
