const { _normalize, _parseGeom } = require('../src/parking/parking.service');

describe('Parking service — parseGeom', () => {
  test('parses a WKT POINT(lng lat) string', () => {
    expect(_parseGeom('POINT(11.113621 46.0702)')).toEqual({ lng: 11.113621, lat: 46.0702 });
  });
  test('returns nulls for malformed input', () => {
    expect(_parseGeom('not-a-point')).toEqual({ lat: null, lng: null });
    expect(_parseGeom(null)).toEqual({ lat: null, lng: null });
  });
});

describe('Parking service — normalize', () => {
  const base = {
    id: 161635, name: 'Test Park', type: 'car',
    capacity: 100, freeslots: 80, busy: 20,
    geom: 'POINT(11.12 46.07)', address: 'Via Test 1',
    updated_at_tm: '2026-06-02 20:00:00',
  };

  test('maps fields and computes occupancy + status (verde)', () => {
    const p = _normalize(base);
    expect(p.id).toBe('161635');
    expect(p.type).toBe('car');
    expect(p.free).toBe(80);
    expect(p.occupied).toBe(20);
    expect(p.occupancyPct).toBe(20);
    expect(p.status).toBe('verde');
    expect(p.latitude).toBe(46.07);
    expect(p.longitude).toBe(11.12);
  });

  test('giallo between 70% and 90% occupancy', () => {
    expect(_normalize({ ...base, busy: 75, freeslots: 25 }).status).toBe('giallo');
  });

  test('rosso at/above 90% occupancy', () => {
    expect(_normalize({ ...base, busy: 95, freeslots: 5 }).status).toBe('rosso');
  });

  test('derives occupied from capacity - free when busy is missing', () => {
    const p = _normalize({ ...base, busy: undefined, freeslots: 40 });
    expect(p.occupied).toBe(60);
    expect(p.occupancyPct).toBe(60);
  });

  test('unknown type falls back to car; bike preserved', () => {
    expect(_normalize({ ...base, type: 'bike' }).type).toBe('bike');
    expect(_normalize({ ...base, type: 'weird' }).type).toBe('car');
  });
});
