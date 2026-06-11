// Bugfix sui modelli in src/data/models:
// 1. User: mancavano isSuspended e le statistiche denormalizzate scritte da
//    trust.service.calculateTrustScore — Sequelize scartava silenziosamente
//    quei campi negli update (suspendAuthor era di fatto un no-op).
// 2. Event: mancavano tutte le colonne usate da social/socialEvents.service
//    (status, organizerId, startDateTime, likesCount, …) → query e increment
//    fallivano contro lo schema reale; inoltre la create social passava solo
//    organizerId violando il NOT NULL su entityId.
const { Sequelize } = require('sequelize');

// Istanza senza connessione: definire i modelli non tocca il DB.
const sequelize = new Sequelize('postgres://user:pass@localhost:5432/test', { logging: false });
const User = require('../src/data/models/User')(sequelize);
const Event = require('../src/data/models/Event')(sequelize);

describe('User model — social/trust fields', () => {
  test('TC-MDL-01: defines isSuspended and denormalized trust stats', async () => {
    for (const field of [
      'isSuspended', 'completedActivitiesCount', 'publishedActivitiesCount',
      'averageAuthorRating', 'reportsCountLast90Days', 'cancellationRate',
    ]) {
      expect(User.rawAttributes[field]).toBeDefined();
    }
    expect(User.rawAttributes.isSuspended.defaultValue).toBe(false);
  });
});

describe('Event model — social layer fields', () => {
  test('TC-MDL-02: defines the columns used by socialEvents.service', () => {
    for (const field of [
      'title', 'description', 'category', 'locationName', 'address',
      'organizerId', 'startDateTime', 'endDateTime', 'capacity', 'imageUrls',
      'status', 'isFeatured', 'participantsCount',
      'likesCount', 'commentsCount', 'savesCount', 'sharesCount',
    ]) {
      expect(Event.rawAttributes[field]).toBeDefined();
    }
  });

  test('TC-MDL-03: beforeSave maps social fields onto legacy NOT NULL columns', async () => {
    const event = Event.build({
      title: 'Concerto in piazza',
      category: 'MUSICA',
      organizerId: 'b3b8c5e2-0000-4000-8000-000000000001',
      startDateTime: new Date('2026-07-01T18:30:00Z'),
      endDateTime: new Date('2026-07-01T21:00:00Z'),
      capacity: 100,
      address: 'Piazza Duomo',
    });
    await Event.runHooks('beforeSave', event, {});

    expect(event.titolo).toBe('Concerto in piazza');
    expect(event.entityId).toBe('b3b8c5e2-0000-4000-8000-000000000001');
    expect(event.categoria).toBe('musica');
    expect(event.data).toBe('2026-07-01');
    expect(event.orarioInizio).toBe('18:30');
    expect(event.orarioFine).toBe('21:00');
    expect(event.maxPartecipanti).toBe(100);
    expect(event.indirizzo).toBe('Piazza Duomo');
  });

  test('TC-MDL-04: beforeSave maps legacy fields onto the social columns', async () => {
    const event = Event.build({
      titolo: 'Mostra al MUSE',
      categoria: 'cultura',
      entityId: 'b3b8c5e2-0000-4000-8000-000000000002',
      data: '2026-08-10',
      orarioInizio: '09:00',
      orarioFine: '18:00',
      maxPartecipanti: 50,
      indirizzo: 'Corso del Lavoro',
    });
    await Event.runHooks('beforeSave', event, {});

    expect(event.title).toBe('Mostra al MUSE');
    expect(event.organizerId).toBe('b3b8c5e2-0000-4000-8000-000000000002');
    expect(event.category).toBe('CULTURA');
    expect(event.startDateTime).toEqual(new Date('2026-08-10T09:00:00Z'));
    expect(event.endDateTime).toEqual(new Date('2026-08-10T18:00:00Z'));
    expect(event.capacity).toBe(50);
    expect(event.address).toBe('Corso del Lavoro');
  });

  test('TC-MDL-05: unknown social category falls back to "altro"', async () => {
    const event = Event.build({ title: 'X', category: 'NIGHTLIFE' });
    await Event.runHooks('beforeSave', event, {});
    expect(event.categoria).toBe('altro');
  });
});
