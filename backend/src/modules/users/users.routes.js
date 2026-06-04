const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');
const validators = require('../../common/middleware/validation.middleware');

// Protect all users routes
router.use(jwtAuth);

router.get('/me', usersController.me);
router.get('/', requireRoles('admin'), usersController.list);
router.get('/team', requireRoles('manager', 'admin'), usersController.team);
router.post('/invite', requireRoles('admin'), validators.invite, usersController.invite);
router.patch('/:id/role', requireRoles('admin'), validators.changeRole, usersController.changeRole);
router.patch('/:id/manager', requireRoles('admin'), validators.changeManager, usersController.changeManager);
router.patch('/:id/status', requireRoles('admin'), validators.changeStatus, usersController.changeStatus);

module.exports = router;
