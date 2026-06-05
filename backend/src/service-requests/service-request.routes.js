const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ServiceRequest } = require('../data/models');
const { SERVICE_REQUEST_CATEGORIES } = require('../data/models/ServiceRequest');

// POST /api/service-requests — registered citizens flag a civic need
// RNF22 compliant: structured category only, no free text
router.post('/', authenticate, authorize('UtenteRegistrato'), async (req, res, next) => {
  try {
    const { categoria, latitudine, longitudine } = req.body;

    if (!SERVICE_REQUEST_CATEGORIES.includes(categoria)) {
      return res.status(400).json({ error: 'Categoria non valida', code: 'INVALID_CATEGORY' });
    }
    if (typeof latitudine !== 'number' || typeof longitudine !== 'number') {
      return res.status(400).json({ error: 'Coordinate mancanti o non numeriche', code: 'MISSING_COORDS' });
    }

    const record = await ServiceRequest.create({
      categoria,
      latitudine,
      longitudine,
      userId: req.user.id,
    });

    // Return only non-personal fields
    res.status(201).json({ id: record.id, categoria: record.categoria, createdAt: record.createdAt });
  } catch (e) { next(e); }
});

module.exports = router;
