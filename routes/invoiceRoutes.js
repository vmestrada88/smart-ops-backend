/**
 * @file Defines routes for invoice-related operations.
 * @module routes/invoiceRoutes
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const adminAuth = require('../middleware/adminAuth');
const { auth } = require('../middleware/auth');

/**
 * Route to get all invoices.
 * Requires authentication.
 */
router.get("/", auth, invoiceController.getAllInvoices); // Get all invoices

/**
 * Route to create a new invoice.
 * Requires admin authentication.
 */
router.post("/", auth, adminAuth, invoiceController.createInvoice); // Create a new invoice

/**
 * Route to get an invoice by ID.
 * Requires authentication.
 */
router.get("/:id", auth, invoiceController.getInvoiceById); // Get invoice by ID

/**
 * Route to update an invoice by ID.
 * Requires admin authentication.
 */
router.put("/:id", auth, adminAuth, invoiceController.updateInvoice); // Update invoice by ID

/**
 * Route to delete an invoice by ID.
 * Requires admin authentication.
 */
router.delete("/:id", auth, adminAuth, invoiceController.deleteInvoice); // Delete invoice by ID

module.exports = router; // Export the router
