const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');

// Protect all routes
router.use(jwtAuth);

router.get('/', notificationController.list);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
