/**
 * @file Defines routes for user-related operations.
 * @module routes/usersRoutes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const adminAuth = require('../middleware/adminAuth');
const {auth} = require('../middleware/auth');

/**
 * Lets admins read any user; everyone else may only read their own record.
 */
const selfOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || String(req.user.id) === String(req.params.id)) return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

/**
 * Route to get all users.
 * Requires admin authentication.
 */
router.get('/', auth, adminAuth, userController.getAllUsers); // Get all users
// Public to authenticated users: list technicians
router.get('/technicians', auth, userController.getTechnicians);

/**
 * Route to create a new user.
 * Requires admin authentication.
 */
router.post('/', auth, adminAuth, userController.createUser); // Create a new user

/**
 * Route to get a user by ID.
 * Requires authentication; non-admins can only read themselves.
 */
router.get('/:id', auth, selfOrAdmin, userController.getUserById); // Get user by ID

/**
 * Route to update a user by ID.
 * Requires admin authentication.
 */
router.put('/:id', auth, adminAuth, userController.updateUser); // Update user by ID

/**
 * Route to delete a user by ID.
 * Requires admin authentication.
 */
router.delete('/:id', auth, adminAuth, userController.deleteUser); // Delete user by ID

module.exports = router; // Export the router
