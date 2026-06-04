const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');

// Protect all reports routes
router.use(jwtAuth);
router.use(requireRoles('manager', 'admin'));

router.post('/export/csv', reportsController.exportCsv);
router.post('/export/pdf', reportsController.exportPdf);
router.get('/team-summary', reportsController.teamSummary);

module.exports = router;
