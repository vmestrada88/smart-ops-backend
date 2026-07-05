/**
 * Amazon Associates storefront listings (separate from /api/products inventory).
 * @module routes/amazonAffiliateListingRoutes
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const controller = require('../controllers/amazonAffiliateListingController');

router.get('/admin/all', auth, adminAuth, controller.listAllAdmin);
router.get('/', controller.listPublished);
router.post('/import-from-url', auth, adminAuth, controller.importFromUrl);
router.post('/', auth, adminAuth, controller.create);
router.put('/:id', auth, adminAuth, controller.update);
router.delete('/:id', auth, adminAuth, controller.destroy);

module.exports = router;
