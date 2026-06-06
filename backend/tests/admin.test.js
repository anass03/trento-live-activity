const request = require('supertest');
const express = require('express');

// ── shared mock setup ──────────────────────────────────────────────────────
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock('../src/data/models', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Activity: { findAll: jest.fn().mockResolvedValue([]), destroy: jest.fn().mockResolvedValue(0) },
  Event:    { findAll: jest.fn().mockResolvedValue([]), destroy: jest.fn().mockResolvedValue(0) },
  Report:      { destroy: jest.fn().mockResolvedValue(0) },
  Participation: { destroy: jest.fn().mockResolvedValue(0) },
  CittadinoProfile: {},
  EnteProfile: {},
  AmministratoreComunaleProfile: {},
  AmministratoreSistemaProfile: { findOne: jest.fn() },
}));

// Default auth mock: superAdmin = true (Anas-like). Tests that need a non-super
// user create a separate express app with an overridden authenticate mock.
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', ruolo: 'AmministratoreDiSistema', superAdmin: true, jti: 'jti-1' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
  authorizeSuperAdmin: () => (_req, _res, next) => next(),
}));

const { User, AmministratoreSistemaProfile } = require('../src/data/models');
const adminRoutes = require('../src/admin/admin.routes');

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

// ── Entity approval ────────────────────────────────────────────────────────
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
    User.findOne.mockResolvedValue({ id: 'e1', email: 'e@test.it', nomeEnte: 'Test', destroy });
    const res = await request(app).patch('/admin/entities/e1/reject');
    expect(res.status).toBe(200);
    expect(destroy).toHaveBeenCalled();
  });
});

// ── User management ────────────────────────────────────────────────────────
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

  test('TC-ADM-05: DELETE /admin/users/:id cascades deletion for non-sistema user', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    User.findByPk.mockResolvedValue({ id: 'u1', ruolo: 'UtenteRegistrato', email: 'u@t.it', destroy });
    const res = await request(app).delete('/admin/users/u1');
    expect(res.status).toBe(204);
    expect(destroy).toHaveBeenCalled();
  });

  test('TC-ADM-06: DELETE /admin/users/:id refuses self-delete', async () => {
    User.findByPk.mockResolvedValue({ id: 'admin-1', ruolo: 'AmministratoreDiSistema', destroy: jest.fn() });
    const res = await request(app).delete('/admin/users/admin-1');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_DELETE_FORBIDDEN');
  });

  test('TC-ADM-05b: DELETE /admin/users/:id with superAdmin=true can delete another sistema admin', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    // The mock auth sets superAdmin: true, so this should pass
    User.findByPk.mockResolvedValue({ id: 'admin-2', ruolo: 'AmministratoreDiSistema', email: 'other@test.it', destroy });
    const res = await request(app).delete('/admin/users/admin-2');
    expect(res.status).toBe(204);
    expect(destroy).toHaveBeenCalled();
  });
});

// ── Super admin guards ─────────────────────────────────────────────────────
describe('Admin routes — super admin guards', () => {
  // Build a separate app instance with superAdmin: false to test the gate
  let appNonSuper;

  beforeAll(() => {
    // Inline middleware override — same routes module, different auth injection
    appNonSuper = express();
    appNonSuper.use(express.json());
    appNonSuper.use((req, _res, next) => {
      req.user = { id: 'admin-99', ruolo: 'AmministratoreDiSistema', superAdmin: false, jti: 'jti-99' };
      next();
    });
    appNonSuper.use('/admin', adminRoutes);
  });

  beforeEach(() => jest.clearAllMocks());

  test('TC-ADM-07: DELETE sistema admin is blocked for non-super admin', async () => {
    User.findByPk.mockResolvedValue({ id: 'admin-2', ruolo: 'AmministratoreDiSistema', email: 'other@t.it', destroy: jest.fn() });
    const res = await request(appNonSuper).delete('/admin/users/admin-2');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUPER_ADMIN_REQUIRED');
  });

  test('TC-ADM-08: PATCH /admin/users/sistema/:id/super-admin toggles the flag', async () => {
    const profileUpdate = jest.fn().mockResolvedValue(undefined);
    User.findOne.mockResolvedValue({
      id: 'admin-2',
      ruolo: 'AmministratoreDiSistema',
      sistemaProfile: { superAdmin: false, update: profileUpdate },
    });
    const res = await request(app)
      .patch('/admin/users/sistema/admin-2/super-admin')
      .send({ superAdmin: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'admin-2', superAdmin: true });
    expect(profileUpdate).toHaveBeenCalledWith({ superAdmin: true });
  });

  test('TC-ADM-09: PATCH super-admin refuses self-modify', async () => {
    User.findOne.mockResolvedValue({
      id: 'admin-1', // same as req.user.id in default mock
      ruolo: 'AmministratoreDiSistema',
      sistemaProfile: { superAdmin: true, update: jest.fn() },
    });
    const res = await request(app)
      .patch('/admin/users/sistema/admin-1/super-admin')
      .send({ superAdmin: false });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_MODIFY_FORBIDDEN');
  });
});
