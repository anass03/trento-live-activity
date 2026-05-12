const dashboardService = require('../src/dashboard/dashboard.service');

jest.mock('../src/data/models', () => ({
  sequelize: { fn: jest.fn(), col: jest.fn() },
  Activity: { count: jest.fn(), findAll: jest.fn() },
  Event: { count: jest.fn() },
  Participation: { count: jest.fn() },
  POI: { count: jest.fn(), findAll: jest.fn() },
  User: { count: jest.fn() },
}));

const { Activity, Event, Participation, POI, User } = require('../src/data/models');

describe('Dashboard Service — getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.count.mockResolvedValue(10);
    Activity.count.mockResolvedValue(5);
    Event.count.mockResolvedValue(3);
    POI.count.mockResolvedValue(8);
    Activity.findAll.mockResolvedValue([{ tipo: 'sport', count: 3 }, { tipo: 'cultura', count: 2 }]);
    POI.findAll.mockResolvedValue([{ statoAffollamento: 'verde', count: 5 }]);
    Participation.count.mockResolvedValue(12);
  });

  test('TC-DASH-01: aggregates basic stats', async () => {
    const stats = await dashboardService.getStats({});
    expect(stats.totalUsers).toBe(10);
    expect(stats.totalActivities).toBe(5);
    expect(stats.totalEvents).toBe(3);
    expect(stats.activitiesByType).toHaveLength(2);
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
