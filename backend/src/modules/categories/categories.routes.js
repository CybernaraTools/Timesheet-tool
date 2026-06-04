const express = require('express');
const router = express.Router();
const categoriesController = require('./categories.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');

// Protect all category routes
router.use(jwtAuth);

router.get('/', categoriesController.listActive);
router.post('/', requireRoles('manager', 'admin'), categoriesController.create);
router.patch('/:id', requireRoles('manager', 'admin'), categoriesController.update);
router.delete('/:id', requireRoles('admin'), categoriesController.delete);

module.exports = router;
