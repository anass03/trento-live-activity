const request = require('supertest');
const express = require('express');

jest.mock('../src/data/models', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => { req.user = { id: 'admin-1', ruolo: 'AmministratoreDiSistema', jti: 'jti-1' }; next(); },
  authorize: () => (_req, _res, next) => next(),
}));

const { User } = require('../src/data/models');
const adminRoutes = require('../src/admin/admin.routes');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

describe('Admin routes — entity approval', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-ADM-01: GET /admin/entities/pending lists unapproved entities', async () => {
    User.findAll.mockResolvedValue([
      { id: 'e1', email: 'e1@example.com', nome: 'Ente', nomeEnte: 'Castello', createdAt: new Date() },
    ]);
    const res = await request(app).get('/admin/entities/pending');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nomeEnte).toBe('Castello');
  });

  test('TC-ADM-02: PATCH /admin/entities/:id/approve sets approvato=true', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    User.findOne.mockResolvedValue({ id: 'e1', update });
    const res = await request(app).patch('/admin/entities/e1/approve');
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ approvato: true });
  });

  test('TC-ADM-03: PATCH /admin/entities/:id/reject deletes the entity', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    User.findOne.mockResolvedValue({ id: 'e1', destroy });
    const res = await request(app).patch('/admin/entities/e1/reject');
    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalled();
  });
});

describe('Admin routes — user management', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-ADM-04: GET /admin/users returns users list', async () => {
    User.findAll.mockResolvedValue([
      { id: 'u1', email: 'u1@example.com', nome: 'U', cognome: 'One', ruolo: 'UtenteRegistrato', approvato: false, nomeEnte: null, createdAt: new Date() },
    ]);
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('TC-ADM-05: DELETE /admin/users/:id cascades deletion', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    User.findByPk.mockResolvedValue({ id: 'u1', destroy });
    const res = await request(app).delete('/admin/users/u1');
    expect(res.status).toBe(204);
    expect(destroy).toHaveBeenCalled();
  });

  test('TC-ADM-06: DELETE /admin/users/:id refuses self-delete', async () => {
    User.findByPk.mockResolvedValue({ id: 'admin-1', destroy: jest.fn() });
    const res = await request(app).delete('/admin/users/admin-1');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_DELETE_FORBIDDEN');
  });
});
