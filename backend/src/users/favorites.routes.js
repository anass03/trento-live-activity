const router = require('express').Router();
const { Favorite } = require('../data/models');
const { authenticate } = require('../middleware/auth');

const VALID_TYPES = ['poi', 'activity', 'event'];

// Lista preferiti dell'utente corrente
router.get('/', authenticate, async (req, res, next) => {
  try {
    const favs = await Favorite.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(favs);
  } catch (e) { next(e); }
});

// Aggiungi un preferito
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { markerType, markerId } = req.body || {};
    if (!VALID_TYPES.includes(markerType)) {
      return res.status(400).json({ error: 'markerType must be one of poi|activity|event', code: 'INVALID_TYPE' });
    }
    if (!markerId) return res.status(400).json({ error: 'markerId is required', code: 'MISSING_FIELD' });
    // L'indice UNIQUE su (userId, markerType, markerId) impedisce duplicati.
    const [fav] = await Favorite.findOrCreate({
      where: { userId: req.user.id, markerType, markerId },
      defaults: { userId: req.user.id, markerType, markerId },
    });
    res.status(201).json(fav);
  } catch (e) { next(e); }
});

// Rimuovi un preferito (per chiave composta)
router.delete('/', authenticate, async (req, res, next) => {
  try {
    const { markerType, markerId } = req.query;
    if (!VALID_TYPES.includes(markerType)) {
      return res.status(400).json({ error: 'markerType invalid', code: 'INVALID_TYPE' });
    }
    await Favorite.destroy({ where: { userId: req.user.id, markerType, markerId } });
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
