const express = require('express');
const router = Router = express.Router();
const clientsController = require('./clients.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');

// Protect all client routes
router.use(jwtAuth);

router.get('/', clientsController.listActive);
router.post('/', requireRoles('manager', 'admin'), clientsController.create);
router.patch('/:id', requireRoles('manager', 'admin'), clientsController.update);
router.delete('/:id', requireRoles('admin'), clientsController.delete);

module.exports = router;
