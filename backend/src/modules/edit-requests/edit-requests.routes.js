const express = require('express');
const router = express.Router();
const editRequestsController = require('./edit-requests.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');
const validators = require('../../common/middleware/validation.middleware');

// Protect all routes
router.use(jwtAuth);

router.post('/', requireRoles('employee', 'manager'), validators.editRequest, editRequestsController.submit);
router.get('/', requireRoles('manager', 'admin'), editRequestsController.list);
router.get('/mine', requireRoles('employee', 'manager'), editRequestsController.mine);
router.get('/my-approved', requireRoles('manager', 'admin'), editRequestsController.myApproved);
router.patch('/:id/approve', requireRoles('manager', 'admin'), editRequestsController.approve);
router.patch('/:id/reject', requireRoles('manager', 'admin'), editRequestsController.reject);

module.exports = router;
