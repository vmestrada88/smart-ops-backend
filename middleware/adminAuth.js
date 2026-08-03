const adminAuth = (req, res, next) => {
  try {
    console.log('User in adminAuth:', req.user);

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    console.error('❌ AdminAuth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Permission verification error' 
    });
  }
};

module.exports = adminAuth;