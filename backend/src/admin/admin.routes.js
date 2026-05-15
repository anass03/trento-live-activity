const router = require('express').Router();
const {
  User, Activity, Event, Report, Participation,
  CittadinoProfile, EnteProfile,
  AmministratoreComunaleProfile, AmministratoreSistemaProfile,
} = require('../data/models');
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
            attributes: ['id', 'email', 'nome', 'cognome', 'ruolo', 'approvato', 'nomeEnte', 'codiceFiscale', 'pec', 'createdAt'],
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) { next(error); }
});

// GET cittadini (con join al profilo) — pagina admin a tabs
router.get('/users/cittadini', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const rows = await User.findAll({
            where: { ruolo: 'UtenteRegistrato' },
            attributes: ['id', 'email', 'createdAt', 'emailVerified'],
            include: [{ model: CittadinoProfile, as: 'cittadinoProfile' }],
            order: [['createdAt', 'DESC']],
        });
        res.json(rows.map((u) => ({
            id: u.id,
            email: u.email,
            createdAt: u.createdAt,
            emailVerified: u.emailVerified,
            nome: u.cittadinoProfile?.nome,
            cognome: u.cittadinoProfile?.cognome,
            dataNascita: u.cittadinoProfile?.dataNascita,
            codiceFiscale: u.cittadinoProfile?.codiceFiscale,
            interessi: u.cittadinoProfile?.interessi || [],
        })));
    } catch (error) { next(error); }
});

// GET enti certificati (con join al profilo)
router.get('/users/enti', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const rows = await User.findAll({
            where: { ruolo: 'EnteCertificato' },
            attributes: ['id', 'email', 'createdAt', 'emailVerified'],
            include: [{ model: EnteProfile, as: 'enteProfile' }],
            order: [['createdAt', 'DESC']],
        });
        res.json(rows.map((u) => ({
            id: u.id,
            email: u.email,
            createdAt: u.createdAt,
            emailVerified: u.emailVerified,
            nomeEnte: u.enteProfile?.nomeEnte,
            pec: u.enteProfile?.pec,
            approvato: u.enteProfile?.approvato ?? false,
            noteAdmin: u.enteProfile?.noteAdmin,
        })));
    } catch (error) { next(error); }
});

// GET amministratori comunali
router.get('/users/comunali', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const rows = await User.findAll({
            where: { ruolo: 'AmministratoreComunale' },
            attributes: ['id', 'email', 'createdAt'],
            include: [{ model: AmministratoreComunaleProfile, as: 'comunaleProfile' }],
            order: [['createdAt', 'DESC']],
        });
        res.json(rows.map((u) => ({
            id: u.id,
            email: u.email,
            createdAt: u.createdAt,
            nome: u.comunaleProfile?.nome,
            cognome: u.comunaleProfile?.cognome,
            ufficio: u.comunaleProfile?.ufficio,
            spidId: u.comunaleProfile?.spidId,
        })));
    } catch (error) { next(error); }
});

// GET amministratori di sistema
router.get('/users/sistema', authenticate, authorize('AmministratoreDiSistema'), async (req, res, next) => {
    try {
        const rows = await User.findAll({
            where: { ruolo: 'AmministratoreDiSistema' },
            attributes: ['id', 'email', 'createdAt', 'twoFactorEnabled'],
            include: [{ model: AmministratoreSistemaProfile, as: 'sistemaProfile' }],
            order: [['createdAt', 'DESC']],
        });
        res.json(rows.map((u) => ({
            id: u.id,
            email: u.email,
            createdAt: u.createdAt,
            twoFactorEnabled: u.twoFactorEnabled,
            nome: u.sistemaProfile?.nome,
            cognome: u.sistemaProfile?.cognome,
            superAdmin: u.sistemaProfile?.superAdmin ?? false,
        })));
    } catch (error) { next(error); }
});

// DELETE a user account (system admin only). Manually cascades all related data.
// DeviceToken/Consent/*Profile sono ON DELETE CASCADE nell'associazione.
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

        // DeviceToken, Consent e i profili 1:1 sono CASCADE: user.destroy() li elimina.
        await user.destroy();
        res.status(204).send();
    } catch (error) { next(error); }
});

module.exports = router;