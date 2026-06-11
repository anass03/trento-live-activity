// Hardening: la validazione `typeof latitudine !== 'number'` accettava anche
// NaN/Infinity (typeof NaN === 'number'). Ora si usa Number.isFinite.
// I test coprono il contratto dell'endpoint (coordinate e sottocategorie).
const request = require('supertest');
const express = require('express');

jest.mock('../src/data/models', () => ({
  ServiceRequest: { create: jest.fn() },
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', ruolo: 'UtenteRegistrato', jti: 'jti-1' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const { ServiceRequest } = require('../src/data/models');
const serviceRequestRoutes = require('../src/service-requests/service-request.routes');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/service-requests', serviceRequestRoutes);
app.use(errorHandler);

describe('Service Requests — coordinate validation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-SR-01: valid request is created (201)', async () => {
    ServiceRequest.create.mockResolvedValue({
      id: 'sr-1', categoria: 'sport', sottocategoria: 'basket', createdAt: new Date(),
    });
    const res = await request(app)
      .post('/api/service-requests')
      .send({ categoria: 'sport', sottocategoria: 'basket', latitudine: 46.07, longitudine: 11.12 });
    expect(res.status).toBe(201);
    expect(ServiceRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      categoria: 'sport', sottocategoria: 'basket', latitudine: 46.07, longitudine: 11.12,
    }));
  });

  test('TC-SR-02: missing coordinates are rejected with 400', async () => {
    const res = await request(app)
      .post('/api/service-requests')
      .send({ categoria: 'sport', latitudine: null, longitudine: 11.12 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_COORDS');
    expect(ServiceRequest.create).not.toHaveBeenCalled();
  });

  test('TC-SR-03: string coordinates are rejected with 400', async () => {
    const res = await request(app)
      .post('/api/service-requests')
      .send({ categoria: 'sport', latitudine: '46.07', longitudine: '11.12' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_COORDS');
  });

  test('TC-SR-04: subcategory of another category is rejected', async () => {
    const res = await request(app)
      .post('/api/service-requests')
      .send({ categoria: 'sport', sottocategoria: 'biblioteca', latitudine: 46.07, longitudine: 11.12 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SUBCATEGORY');
  });
});
