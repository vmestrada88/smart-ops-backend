/**
 * Roles that work inside the company (as opposed to 'client' users).
 * @type {string[]}
 */
const STAFF_ROLES = ['admin', 'manager', 'technician'];

/**
 * Builds a middleware that only lets through users whose role is in `roles`.
 * Must run after `auth`, which populates `req.user`.
 * @param {...string} roles
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient privileges.'
    });
  }
  next();
};

module.exports = { requireRole, STAFF_ROLES };
