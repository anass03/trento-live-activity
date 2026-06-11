const request = require('supertest');
const express = require('express');
const dashboardService = require('../src/dashboard/dashboard.service');

jest.mock('../src/data/models', () => ({
  sequelize: { fn: jest.fn(), col: jest.fn(), literal: jest.fn() },
  Activity: { count: jest.fn(), findAll: jest.fn() },
  Event: { count: jest.fn(), findAll: jest.fn() },
  Participation: { count: jest.fn() },
  POI: { count: jest.fn(), findAll: jest.fn() },
  ServiceRequest: { findAll: jest.fn() },
}));

const { Activity, Event, Participation, POI } = require('../src/data/models');

describe('Dashboard Service — getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Activity.count.mockResolvedValue(5);
    Event.count.mockResolvedValue(3);
    POI.count.mockResolvedValue(8);
    Activity.findAll.mockResolvedValue([{ tipo: 'sport', count: 3 }, { tipo: 'cultura', count: 2 }]);
    Event.findAll.mockResolvedValue([{ categoria: 'musica', count: 2 }]);
    POI.findAll
      // 1° call: poiCrowding (group by)
      .mockResolvedValueOnce([{ statoAffollamento: 'verde', count: 5 }])
      // 2° call: topCrowdedPOIs (lista)
      .mockResolvedValueOnce([]);
    Participation.count.mockResolvedValue(12);
  });

  test('TC-DASH-01: aggregates basic stats (scope ridotto — no totalUsers)', async () => {
    const stats = await dashboardService.getStats({});
    // Il Comune non vede MAI il totale utenti (#15)
    expect(stats.totalUsers).toBeUndefined();
    expect(stats.totalActivities).toBe(5);
    expect(stats.totalEvents).toBe(3);
    expect(stats.activitiesByType).toHaveLength(2);
    expect(stats.eventsByCategory).toHaveLength(1);
    expect(stats.poiCrowding).toHaveLength(1);
  });

  test('TC-DASH-02: passes tipo filter to Activity.count (RF29)', async () => {
    await dashboardService.getStats({ tipo: 'sport' });
    expect(Activity.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tipo: 'sport' }),
    }));
  });

  test('TC-DASH-03: applies geographic bounding box when centerLat/Lng/radius provided', async () => {
    await dashboardService.getStats({ centerLat: 46.0664, centerLng: 11.1216, radiusKm: 1 });
    const call = Activity.count.mock.calls[0][0];
    expect(call.where).toHaveProperty('latitudine');
    expect(call.where).toHaveProperty('longitudine');
  });

  test('TC-DASH-04: filters by poiId when provided', async () => {
    await dashboardService.getStats({ poiId: 'poi-123' });
    const call = Activity.count.mock.calls[0][0];
    expect(call.where).toHaveProperty('poiId', 'poi-123');
  });
});

// ── RF30: export endpoint (GET /api/dashboard/stats/export) ────────────────

const STATS_FIXTURE = {
  totalActivities: 5,
  totalEvents: 3,
  totalPOIs: 8,
  totalParticipations: 12,
  activitiesByType: [{ tipo: 'sport', count: 3 }, { tipo: 'cultura', count: 2 }],
  eventsByCategory: [{ categoria: 'musica', count: 2 }],
  poiCrowding: [{ statoAffollamento: 'verde', count: 5 }, { statoAffollamento: 'rosso', count: 3 }],
  topCrowdedPOIs: [{ nome: 'Piazza Duomo', tipo: 'piazza', statoAffollamento: 'rosso', capacitaMax: 500 }],
  poiByType: [{ tipo: 'piazza', count: 4 }],
  activitiesByDay: [{ date: '2026-06-10', count: 2 }],
  activitiesByHour: [{ hour: '18', count: 4 }],
  filters: { tipo: null, da: '2026-05-01', a: null, centerLat: undefined, centerLng: undefined, radiusKm: undefined, poiId: undefined },
};

const NEEDS_FIXTURE = {
  total: 7,
  byCategory: [{ categoria: 'parcheggio', count: 4 }, { categoria: 'sport', count: 3 }],
  bySubcategory: [{ categoria: 'parcheggio', sottocategoria: 'auto', count: 4 }],
};

function buildExportApp(ruolo = 'AmministratoreComunale') {
  // Real authorize middleware + real controller; only authentication is stubbed.
  const { authorize } = require('../src/middleware/auth');
  const ctrl = require('../src/dashboard/dashboard.controller');
  const app = express();
  app.get(
    '/api/dashboard/stats/export',
    (req, _res, next) => { req.user = { id: 'u1', ruolo }; next(); },
    authorize('AmministratoreComunale'),
    ctrl.exportStats,
  );
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  return app;
}

describe('Dashboard export endpoint — RF30', () => {
  let getStatsSpy;
  let getNeedsSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    getStatsSpy = jest.spyOn(dashboardService, 'getStats').mockResolvedValue(STATS_FIXTURE);
    getNeedsSpy = jest.spyOn(dashboardService, 'getServiceRequestStats').mockResolvedValue(NEEDS_FIXTURE);
    POI.findAll.mockResolvedValue([
      { id: 'p1', nome: 'Piazza Duomo', tipo: 'piazza', latitudine: 46.07, longitudine: 11.12, capacitaMax: 500, statoAffollamento: 'rosso', indirizzo: 'Piazza Duomo 1' },
    ]);
  });

  afterEach(() => {
    getStatsSpy.mockRestore();
    getNeedsSpy.mockRestore();
  });

  test('TC-EXP-01: CSV export returns text/csv with attachment filename and sections', async () => {
    const res = await request(buildExportApp())
      .get('/api/dashboard/stats/export?format=csv&datasets=kpi,activities');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=".*\.csv"/);
    expect(res.text).toContain('# KPI E RIEPILOGO');
    expect(res.text).toContain('# ATTIVITÀ PER TIPO');
    expect(res.text).toContain('"sport","3"');
  });

  test('TC-EXP-02: default dataset is kpi when none specified', async () => {
    const res = await request(buildExportApp()).get('/api/dashboard/stats/export?format=csv');
    expect(res.status).toBe(200);
    expect(res.text).toContain('# KPI E RIEPILOGO');
    expect(res.text).not.toContain('# INVENTARIO POI');
  });

  test('TC-EXP-03: PDF export returns a valid PDF stream', async () => {
    const res = await request(buildExportApp())
      .get('/api/dashboard/stats/export?format=pdf&datasets=kpi,activities,poi_crowding,poi_inventory,supply_demand,citizen_needs')
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=".*\.pdf"/);
    expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
    expect(getNeedsSpy).toHaveBeenCalled();
    expect(POI.findAll).toHaveBeenCalled();
  });

  test('TC-EXP-04: forwards filters (da/tipo) to the stats service', async () => {
    await request(buildExportApp()).get('/api/dashboard/stats/export?format=csv&datasets=kpi&da=2026-05-01&tipo=sport');
    expect(getStatsSpy).toHaveBeenCalledWith(expect.objectContaining({ da: '2026-05-01', tipo: 'sport' }));
  });

  test('TC-EXP-05: citizen_needs dataset uses aggregated service-request stats (scope ridotto)', async () => {
    const res = await request(buildExportApp()).get('/api/dashboard/stats/export?format=csv&datasets=citizen_needs');
    expect(res.status).toBe(200);
    expect(getNeedsSpy).toHaveBeenCalled();
    expect(getStatsSpy).not.toHaveBeenCalled();
    expect(res.text).toContain('SEGNALAZIONI PER CATEGORIA');
    expect(res.text).toContain('"parcheggio","4"');
  });

  test('TC-EXP-06: unsupported format returns 400 INVALID_FORMAT', async () => {
    const res = await request(buildExportApp()).get('/api/dashboard/stats/export?format=xlsx');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FORMAT');
  });

  test('TC-EXP-07: roles other than AmministratoreComunale get 403 (authorize reale)', async () => {
    for (const ruolo of ['UtenteRegistrato', 'EnteCertificato', 'AmministratoreDiSistema']) {
      const res = await request(buildExportApp(ruolo)).get('/api/dashboard/stats/export?format=csv');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
  });

  test('TC-EXP-08: unknown datasets produce an empty but valid CSV (no crash)', async () => {
    const res = await request(buildExportApp()).get('/api/dashboard/stats/export?format=csv&datasets=bogus');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });
});
