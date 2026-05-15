const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { suggestActivity } = require('./ai.service');

// Suggester di categoria/orario per attività spontanee.
// Solo cittadini autenticati possono usarlo (consumo API costoso, no ospiti).
router.post('/suggest-activity', authenticate, authorize('UtenteRegistrato'), async (req, res, next) => {
  try {
    const result = await suggestActivity(req.body || {});
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
