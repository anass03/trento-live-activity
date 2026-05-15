const router = require('express').Router();
const { User, Activity, Event, Report, Participation } = require('../data/models');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEntityApproved, sendEntityRejected } = require('../notifications/email.service');

//GET all pending entities
router.get('/entities/pending', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const entities = await User.findAll({
            where: { ruolo: 'EnteCertificato', approvato:false },
            attributes: ['id', 'email', 'nome', 'nomeEnte', 'createdAt'],
        });
        res.json(entities);
    } catch (error) {
        next(error);
    }
});

//PATCH approve
router.patch('/entities/:id/approve', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const entity = await User.findOne({ where: { id: req.params.id, ruolo: 'EnteCertificato' } });
        if (!entity) return res.status(404).json({ error: 'Entity not found', code: 'NOT FOUND' });
        await entity.update({ approvato: true });
        sendEntityApproved(entity.email, entity.nomeEnte).catch(() => {});
        res.json({ message: 'Entity approved' });
    } catch (error) {
        next(error);
    }
});

//PATCH reject (delete the account)
router.patch('/entities/:id/reject', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const entity = await User.findOne({ where: { id: req.params.id, ruolo: 'EnteCertificato' } });
        if (!entity) return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
        const { email, nomeEnte } = entity;
        await entity.destroy();
        sendEntityRejected(email, nomeEnte).catch(() => {});
        res.json({ message: 'Entity rejected and deleted' });
    } catch (error) {
        next(error);
    }
});

// GET all users (system admin only)
router.get('/users', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'nome', 'cognome', 'ruolo', 'approvato', 'nomeEnte', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) { next(error); }
});

// DELETE a user account (system admin only). Manually cascades all related data.
router.delete('/users/:id', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account admin', code: 'SELF_DELETE_FORBIDDEN' });
        }

        // 1. Participations in activities created by this user
        const ownedActivities = await Activity.findAll({ where: { creatorId: user.id }, attributes: ['id'] });
        for (const act of ownedActivities) {
            await Participation.destroy({ where: { activityId: act.id } });
        }
        // 2. Activities created by this user
        await Activity.destroy({ where: { creatorId: user.id } });

        // 3. Reports on events published by this user, then the events themselves
        const ownedEvents = await Event.findAll({ where: { entityId: user.id }, attributes: ['id'] });
        for (const evt of ownedEvents) {
            await Report.destroy({ where: { eventId: evt.id } });
        }
        await Event.destroy({ where: { entityId: user.id } });

        // 4. Reports filed by this user
        await Report.destroy({ where: { userId: user.id } });

        // 5. Participations this user has joined
        await Participation.destroy({ where: { userId: user.id } });

        // DeviceToken and Consent are CASCADE in the association; user.destroy() handles them.
        await user.destroy();
        res.status(204).send();
    } catch (error) { next(error); }
});

module.exports = router;