/**
 * @file Defines routes for client-related operations.
 * @module routes/clientsRoutes
 */

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const {auth} = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/requireRole');
const { getUserEmail } = require('../utils/clientScope');

const staffOnly = requireRole(...STAFF_ROLES);

/**
 * Staff can look up any client by contact email; a 'client' user only their own.
 */
const ownEmailOrStaff = async (req, res, next) => {
  if (STAFF_ROLES.includes(req.user.role)) return next();
  try {
    const email = await getUserEmail(req.user.id);
    if (email && email.toLowerCase() === String(req.params.email).toLowerCase()) return next();
    return res.status(403).json({ success: false, message: 'Access denied.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Every client route requires a logged-in user
router.use(auth);

/**
 * Route to get all clients.
 * Requires staff role.
 */
router.get('/', staffOnly, clientController.getClients); // Get all clients

/**
 * Route to create a new client.
 * Requires staff role.
 */
router.post('/', staffOnly, clientController.createClient); // Create a new client

/**
 * Route to get a client by contact email.
 * Staff, or the client user that owns that email.
 */
router.get('/by-email/:email', ownEmailOrStaff, clientController.getClientByContactEmail);

/**
 * Route to get a client by ID.
 * Requires staff role.
 */
router.get('/:id', staffOnly, clientController.getClientById); // Get client by ID

/**
 * Route to update a client by ID.
 * Requires staff role.
 */
router.put('/:id', staffOnly, clientController.updateClient); // Update client by ID

/**
 * Route to add a job to a client.
 * Requires staff role.
 */
router.post('/:id/jobs', staffOnly, clientController.addJobToClient); // Add job to client

module.exports = router; // Export the router
