const router = require('express').Router();
const ctrl = require('./socialEvents.controller');
const userCtrl = require('./socialUser.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Feed endpoints (MUST go before /:eventId)
router.get('/feed', optionalAuth, ctrl.getFeed);
router.get('/trending', optionalAuth, ctrl.getTrending);
router.get('/next', optionalAuth, ctrl.getNext);
router.get('/live', optionalAuth, ctrl.getLive);

// Base Event actions
router.get('/', optionalAuth, ctrl.list);
router.get('/:eventId', optionalAuth, ctrl.get);
router.get('/:eventId/participants', optionalAuth, userCtrl.getEventParticipants);
router.post('/', authenticate, ctrl.create);
router.patch('/:eventId', authenticate, ctrl.update);
router.delete('/:eventId', authenticate, ctrl.remove);

// Participation actions
router.post('/:eventId/join', authenticate, ctrl.join);
router.post('/:eventId/leave', authenticate, ctrl.leave);

// Reaction actions
router.post('/:eventId/like', authenticate, ctrl.like);
router.delete('/:eventId/like', authenticate, ctrl.unlike);

// Save actions
router.post('/:eventId/save', authenticate, ctrl.save);
router.delete('/:eventId/save', authenticate, ctrl.unsave);

// Share actions
router.post('/:eventId/share', ctrl.share);

// Comments thread actions
router.get('/:eventId/comments', ctrl.getComments);
router.post('/:eventId/comments', authenticate, ctrl.addComment);

module.exports = router;
