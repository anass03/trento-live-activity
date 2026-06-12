const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ServiceRequest } = require('../data/models');
const {
  SERVICE_REQUEST_CATEGORIES,
  SUBCATEGORIES_BY_CATEGORY,
} = require('../data/models/ServiceRequest');

// POST /api/service-requests — registered citizens flag a civic need
// RNF22 compliant: structured categories and subcategories only, no free text
router.post('/', authenticate, authorize('UtenteRegistrato'), async (req, res, next) => {
  try {
    const { categoria, sottocategoria, latitudine, longitudine } = req.body;

    if (!SERVICE_REQUEST_CATEGORIES.includes(categoria)) {
      return res.status(400).json({ error: 'Categoria non valida', code: 'INVALID_CATEGORY' });
    }
    if (!Number.isFinite(latitudine) || !Number.isFinite(longitudine)) {
      return res.status(400).json({ error: 'Coordinate mancanti o non numeriche', code: 'MISSING_COORDS' });
    }
    // Validate subcategory — must belong to the selected categoria (RNF22)
    if (sottocategoria !== undefined && sottocategoria !== null) {
      const allowed = SUBCATEGORIES_BY_CATEGORY[categoria] ?? [];
      if (!allowed.includes(sottocategoria)) {
        return res.status(400).json({
          error: 'Sottocategoria non valida per questa categoria',
          code: 'INVALID_SUBCATEGORY',
        });
      }
    }

    const record = await ServiceRequest.create({
      categoria,
      sottocategoria: sottocategoria ?? null,
      latitudine,
      longitudine,
      userId: req.user.id,
    });

    // Return only non-personal fields
    res.status(201).json({
      id: record.id,
      categoria: record.categoria,
      sottocategoria: record.sottocategoria,
      createdAt: record.createdAt,
    });
  } catch (e) { next(e); }
});

module.exports = router;
