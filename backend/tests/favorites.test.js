const request = require('supertest');
const express = require('express');

jest.mock('../src/data/models', () => ({
  Favorite: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Bypassa il JWT reale: inietta direttamente l'utente autenticato.
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => { req.user = { id: 'user-1' }; next(); },
}));

const { Favorite } = require('../src/data/models');
const favoritesRouter = require('../src/users/favorites.routes');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/favorites', favoritesRouter);
app.use(errorHandler);

describe('Favorites routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-FAV-01: lists current user favorites', async () => {
    Favorite.findAll.mockResolvedValue([{ id: 'f-1', markerType: 'poi', markerId: 'p-1' }]);
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(200);
    expect(Favorite.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
    }));
  });

  test('TC-FAV-02: POST rejects invalid markerType', async () => {
    const res = await request(app).post('/api/favorites').send({ markerType: 'banana', markerId: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TYPE');
  });

  test('TC-FAV-03: POST rejects missing markerId', async () => {
    const res = await request(app).post('/api/favorites').send({ markerType: 'poi' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELD');
  });

  test('TC-FAV-04: POST creates favorite (idempotent via findOrCreate)', async () => {
    Favorite.findOrCreate.mockResolvedValue([{ id: 'f-1', markerType: 'poi', markerId: 'p-1' }, true]);
    const res = await request(app).post('/api/favorites').send({ markerType: 'poi', markerId: 'p-1' });
    expect(res.status).toBe(201);
    expect(Favorite.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', markerType: 'poi', markerId: 'p-1' },
    }));
  });

  test('TC-FAV-05: DELETE rejects missing markerId with 400, not 500', async () => {
    // Regression: `where: { markerId: undefined }` faceva esplodere Sequelize → 500.
    const res = await request(app).delete('/api/favorites').query({ markerType: 'poi' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_FIELD');
    expect(Favorite.destroy).not.toHaveBeenCalled();
  });

  test('TC-FAV-06: DELETE removes favorite by composite key', async () => {
    Favorite.destroy.mockResolvedValue(1);
    const res = await request(app).delete('/api/favorites').query({ markerType: 'poi', markerId: 'p-1' });
    expect(res.status).toBe(204);
    expect(Favorite.destroy).toHaveBeenCalledWith({
      where: { userId: 'user-1', markerType: 'poi', markerId: 'p-1' },
    });
  });
});
