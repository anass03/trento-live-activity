const express = require('express');
const ctrl = require('./socialUser.controller');
const reviewsCtrl = require('./reviews.controller');
const { authenticate, authorize } = require('../middleware/auth');

const usersRouter = express.Router();
const meRouter = express.Router();

const STAFF = ['AmministratoreComunale', 'AmministratoreDiSistema'];

// Users Router
usersRouter.get('/:userId/trust', ctrl.getTrust);
usersRouter.post('/:userId/recalculate-trust', authenticate, authorize(...STAFF), ctrl.recalculateTrust);
usersRouter.post('/:userId/verify-author', authenticate, authorize(...STAFF), ctrl.verify);
usersRouter.post('/:userId/suspend-author', authenticate, authorize(...STAFF), ctrl.suspend);
usersRouter.get('/:userId/reviews-summary', reviewsCtrl.getUserSummary);

// Me Router
meRouter.get('/profile', authenticate, ctrl.getProfile);
meRouter.get('/activities', authenticate, ctrl.getActivities);
meRouter.get('/participations', authenticate, ctrl.getParticipations);
meRouter.get('/saved', authenticate, ctrl.getSaved);
meRouter.get('/upcoming', authenticate, ctrl.getUpcoming);
meRouter.get('/recommendations', authenticate, ctrl.getRecommendations);

module.exports = {
  usersRouter,
  meRouter
};
