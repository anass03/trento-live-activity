const router = require('express').Router();
const ctrl = require('./moderation.controller');
const { authenticate, authorize } = require('../middleware/auth');

const REGISTERED = 'UtenteRegistrato';
const ADMIN_SISTEMA = 'AmministratoreDiSistema';

// RF16: registered users can report an event
router.post('/events/:eventId/report', authenticate, authorize(REGISTERED, 'EnteCertificato'), ctrl.createReport);

// RF33: system admin manages reports
router.get('/reports', authenticate, authorize(ADMIN_SISTEMA), ctrl.listReports);
router.get('/reports/:id', authenticate, authorize(ADMIN_SISTEMA), ctrl.getReport);
router.patch('/reports/:id', authenticate, authorize(ADMIN_SISTEMA), ctrl.resolveReport);

module.exports = router;
