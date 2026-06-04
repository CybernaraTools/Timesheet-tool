const express = require('express');
const router = express.Router();
const timesheetController = require('./timesheet.controller');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const requireRoles = require('../../common/middleware/roleGuard.middleware');
const validators = require('../../common/middleware/validation.middleware');

// Protect all timesheet routes
router.use(jwtAuth);

router.get('/', timesheetController.list);
router.get('/summary', timesheetController.summary);
router.get('/:id', timesheetController.getById);
router.post('/', validators.createEntry, timesheetController.create);
router.post('/bulk', timesheetController.createBulk); // validation is handled inside the controller
router.patch('/:id', validators.updateEntry, timesheetController.update);
router.delete('/:id', requireRoles('manager', 'admin'), timesheetController.delete);

module.exports = router;
