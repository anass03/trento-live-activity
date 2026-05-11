const mapService = require('../src/map/map.service');

jest.mock('../src/data/models', () => ({
  POI: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Activity: { findAll: jest.fn() },
  Event: { findAll: jest.fn() },
}));

const { POI } = require('../src/data/models');

function makePOI(overrides = {}) {
  return {
    id: 'poi-1',
    nome: 'Piazza Duomo',
    latitudine: 46.0664,
    longitudine: 11.1215,
    capacitaMax: 500,
    statoAffollamento: 'verde',
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
}

describe('Map Service — createPOI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-MAP-01: creates POI with valid data', async () => {
    POI.create.mockResolvedValue(makePOI());
    const poi = await mapService.createPOI({ nome: 'Piazza Duomo', latitudine: 46.06, longitudine: 11.12, capacitaMax: 500 });
    expect(POI.create).toHaveBeenCalled();
    expect(poi.nome).toBe('Piazza Duomo');
  });

  test('TC-MAP-02: rejects capacitaMax <= 0 (OCL C20)', async () => {
    await expect(mapService.createPOI({ nome: 'Test', latitudine: 0, longitudine: 0, capacitaMax: 0 }))
      .rejects.toMatchObject({ code: 'INVALID_CAPACITY' });
    await expect(mapService.createPOI({ nome: 'Test', latitudine: 0, longitudine: 0, capacitaMax: -5 }))
      .rejects.toMatchObject({ code: 'INVALID_CAPACITY' });
  });
});

describe('Map Service — updatePOI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('TC-MAP-03: rejects invalid statoAffollamento (OCL C21)', async () => {
    POI.findByPk.mockResolvedValue(makePOI());
    await expect(mapService.updatePOI('poi-1', { statoAffollamento: 'blu' }))
      .rejects.toMatchObject({ code: 'INVALID_STATUS' });
  });

  test('TC-MAP-04: accepts valid crowding states (OCL C21)', async () => {
    for (const stato of ['verde', 'giallo', 'rosso']) {
      const poi = makePOI();
      POI.findByPk.mockResolvedValue(poi);
      await mapService.updatePOI('poi-1', { statoAffollamento: stato });
      expect(poi.update).toHaveBeenCalledWith({ statoAffollamento: stato });
    }
  });

  test('TC-MAP-05: returns 404 for unknown POI', async () => {
    POI.findByPk.mockResolvedValue(null);
    await expect(mapService.updatePOI('nonexistent', { nome: 'X' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
