const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');

// Protect all audit routes
router.use(jwtAuth);
router.use(requireRoles('admin'));

router.get('/', auditController.list);
router.get('/:id', auditController.getDetail);

module.exports = router;
