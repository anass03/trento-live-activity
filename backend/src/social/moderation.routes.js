const express = require('express');
const ctrl = require('./moderation.controller');
const { authenticate, authorize } = require('../middleware/auth');

const reportsRouter = express.Router();
const adminReportsRouter = express.Router();
const adminModerationRouter = express.Router();

const STAFF = ['AmministratoreComunale', 'AmministratoreDiSistema'];

// User reporting endpoint: POST /api/reports
reportsRouter.post('/', authenticate, ctrl.createReport);

// Staff reports management: /api/admin/reports
adminReportsRouter.get('/', authenticate, authorize(...STAFF), ctrl.listReports);
adminReportsRouter.patch('/:reportId', authenticate, authorize(...STAFF), ctrl.patchReport);

// Staff moderation actions: /api/admin/moderation
adminModerationRouter.post('/hide', authenticate, authorize(...STAFF), ctrl.hideItem);
adminModerationRouter.post('/remove', authenticate, authorize(...STAFF), ctrl.removeItem);
adminModerationRouter.post('/restore', authenticate, authorize(...STAFF), ctrl.restoreItem);

module.exports = {
  reportsRouter,
  adminReportsRouter,
  adminModerationRouter
};
