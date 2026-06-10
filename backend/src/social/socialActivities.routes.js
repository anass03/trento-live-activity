const router = require('express').Router();
const ctrl = require('./socialActivities.controller');
const reviewsCtrl = require('./reviews.controller');
const userCtrl = require('./socialUser.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Feed filters (MUST go before /:activityId)
router.get('/recommended', optionalAuth, ctrl.getRecommended);
router.get('/perfect-now', optionalAuth, ctrl.getPerfectNow);
router.get('/rising', optionalAuth, ctrl.getRising);
router.get('/verified', optionalAuth, ctrl.getVerified);

// Standard actions
router.get('/', optionalAuth, ctrl.list);
router.get('/:activityId', optionalAuth, ctrl.get);
router.post('/', authenticate, ctrl.create);
router.patch('/:activityId', authenticate, ctrl.update);
router.delete('/:activityId', authenticate, ctrl.remove);

// Reviews
router.get('/:activityId/reviews', reviewsCtrl.list);
router.post('/:activityId/reviews', authenticate, reviewsCtrl.create);

// Participants
router.get('/:activityId/participants', optionalAuth, userCtrl.getActivityParticipants);

// Joins
router.post('/:activityId/join', authenticate, ctrl.join);
router.post('/:activityId/leave', authenticate, ctrl.leave);

// Bookmarks
router.post('/:activityId/save', authenticate, ctrl.save);
router.delete('/:activityId/save', authenticate, ctrl.unsave);

module.exports = router;
