require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, POI, Activity, Event, Participation } = require('./models');

async function seed() {
  await sequelize.authenticate();
  console.log('PostgreSQL connected');
  await sequelize.sync({ alter: true });

  console.log('Wiping existing data...');
  await Participation.destroy({ where: {}, truncate: true, cascade: true });
  await Activity.destroy({ where: {}, truncate: true, cascade: true });
  await Event.destroy({ where: {}, truncate: true, cascade: true });
  await POI.destroy({ where: {}, truncate: true, cascade: true });
  await User.destroy({ where: {}, truncate: true, cascade: true });

  const pwHash = await bcrypt.hash('password123', 12);

  console.log('Creating users...');
  const [mario, lucia, castello, sportclub, comune, sysadmin] = await Promise.all([
    User.create({
      email: 'mario.rossi@example.com', passwordHash: pwHash,
      nome: 'Mario', cognome: 'Rossi', dataNascita: '1995-05-12',
      ruolo: 'UtenteRegistrato', interessi: ['sport', 'musica'],
    }),
    User.create({
      email: 'lucia.bianchi@example.com', passwordHash: pwHash,
      nome: 'Lucia', cognome: 'Bianchi', dataNascita: '2000-09-23',
      ruolo: 'UtenteRegistrato', interessi: ['cultura', 'arte'],
    }),
    User.create({
      email: 'info@castellotrento.it', passwordHash: pwHash,
      nome: 'Castello', cognome: 'Buonconsiglio', dataNascita: '1990-01-01',
      ruolo: 'EnteCertificato', approvato: true, nomeEnte: 'Castello del Buonconsiglio',
    }),
    User.create({
      email: 'eventi@sportclubtrento.it', passwordHash: pwHash,
      nome: 'Sport', cognome: 'Club', dataNascita: '1985-03-10',
      ruolo: 'EnteCertificato', approvato: true, nomeEnte: 'Sport Club Trento',
    }),
    User.create({
      email: 'dashboard@comune.trento.it', passwordHash: pwHash,
      nome: 'Comune', cognome: 'Trento', dataNascita: '1980-01-01',
      ruolo: 'AmministratoreComunale',
    }),
    User.create({
      email: 'admin@trento-live.it', passwordHash: pwHash,
      nome: 'System', cognome: 'Admin', dataNascita: '1988-06-15',
      ruolo: 'AmministratoreDiSistema',
    }),
  ]);

  console.log('Creating POIs (Trento)...');
  const [piazzaDuomo, castelloPoi, briamasco, museumPoi, parcoAlbere, dossTrento, piazzaFiera, biblioteca] = await Promise.all([
    POI.create({ nome: 'Piazza Duomo', latitudine: 46.0664, longitudine: 11.1216, capacitaMax: 2000, statoAffollamento: 'giallo', tipo: 'piazza', descrizione: 'Cuore storico della città' }),
    POI.create({ nome: 'Castello del Buonconsiglio', latitudine: 46.0719, longitudine: 11.1234, capacitaMax: 500, statoAffollamento: 'verde', tipo: 'monumento', descrizione: 'Castello medievale' }),
    POI.create({ nome: 'Stadio Briamasco', latitudine: 46.0631, longitudine: 11.1100, capacitaMax: 4500, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Stadio cittadino' }),
    POI.create({ nome: 'MUSE - Museo delle Scienze', latitudine: 46.0666, longitudine: 11.1130, capacitaMax: 800, statoAffollamento: 'rosso', tipo: 'museo', descrizione: 'Museo delle Scienze' }),
    POI.create({ nome: 'Parco delle Albere', latitudine: 46.0670, longitudine: 11.1145, capacitaMax: 1500, statoAffollamento: 'giallo', tipo: 'parco', descrizione: 'Grande parco urbano' }),
    POI.create({ nome: 'Doss Trento', latitudine: 46.0750, longitudine: 11.1100, capacitaMax: 300, statoAffollamento: 'verde', tipo: 'panoramico', descrizione: 'Collina panoramica' }),
    POI.create({ nome: 'Piazza Fiera', latitudine: 46.0664, longitudine: 11.1227, capacitaMax: 1000, statoAffollamento: 'verde', tipo: 'piazza' }),
    POI.create({ nome: 'Biblioteca Universitaria', latitudine: 46.0680, longitudine: 11.1250, capacitaMax: 400, statoAffollamento: 'giallo', tipo: 'biblioteca' }),
  ]);

  // Date helper: today + N days as 'YYYY-MM-DD'
  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  console.log('Creating activities...');
  const [calcio, visitaMuse, aperitivo, studio] = await Promise.all([
    Activity.create({
      tipo: 'sport', data: addDays(3), orarioInizio: '18:00', orarioFine: '19:30',
      maxPartecipanti: 10, creatorId: mario.id, poiId: briamasco.id,
      latitudine: briamasco.latitudine, longitudine: briamasco.longitudine,
    }),
    Activity.create({
      tipo: 'cultura', data: addDays(5), orarioInizio: '15:00', orarioFine: '17:00',
      maxPartecipanti: 6, creatorId: lucia.id, poiId: museumPoi.id,
      latitudine: museumPoi.latitudine, longitudine: museumPoi.longitudine,
    }),
    Activity.create({
      tipo: 'musica', data: addDays(2), orarioInizio: '19:00', orarioFine: '21:00',
      maxPartecipanti: 8, creatorId: mario.id, poiId: piazzaDuomo.id,
      latitudine: piazzaDuomo.latitudine, longitudine: piazzaDuomo.longitudine,
    }),
    Activity.create({
      tipo: 'studio', data: addDays(1), orarioInizio: '10:00', orarioFine: '13:00',
      maxPartecipanti: 4, creatorId: lucia.id, poiId: biblioteca.id,
      latitudine: biblioteca.latitudine, longitudine: biblioteca.longitudine,
    }),
  ]);

  console.log('Creating participations (creators auto-join)...');
  await Promise.all([
    Participation.create({ userId: mario.id, activityId: calcio.id }),
    Participation.create({ userId: lucia.id, activityId: visitaMuse.id }),
    Participation.create({ userId: mario.id, activityId: aperitivo.id }),
    Participation.create({ userId: lucia.id, activityId: studio.id }),
    // Cross-participation
    Participation.create({ userId: lucia.id, activityId: calcio.id }),
    Participation.create({ userId: mario.id, activityId: studio.id }),
  ]);

  console.log('Creating certified events...');
  await Promise.all([
    Event.create({
      titolo: 'Mostra "Arte Contemporanea del Trentino"',
      descrizione: 'Una selezione di opere di artisti contemporanei del Trentino-Alto Adige.',
      categoria: 'arte', entityId: castello.id, poiId: castelloPoi.id,
      latitudine: castelloPoi.latitudine, longitudine: castelloPoi.longitudine,
      data: addDays(10), orarioInizio: '10:00', orarioFine: '18:00',
      badgeVerifica: true,
    }),
    Event.create({
      titolo: 'Torneo amatoriale di calcio a 5',
      descrizione: 'Iscrizioni aperte fino al giorno prima. Premio in palio.',
      categoria: 'sport', entityId: sportclub.id, poiId: briamasco.id,
      latitudine: briamasco.latitudine, longitudine: briamasco.longitudine,
      data: addDays(7), orarioInizio: '09:00', orarioFine: '13:00',
      badgeVerifica: true,
    }),
    Event.create({
      titolo: 'Concerto al MUSE',
      descrizione: 'Musica classica nella corte del museo.',
      categoria: 'musica', entityId: castello.id, poiId: museumPoi.id,
      latitudine: museumPoi.latitudine, longitudine: museumPoi.longitudine,
      data: addDays(14), orarioInizio: '20:30', orarioFine: '22:30',
      badgeVerifica: true,
    }),
  ]);

  console.log('\nSeed complete.');
  console.log('\nTest accounts (password for all: "password123"):');
  console.log('  mario.rossi@example.com         (UtenteRegistrato)');
  console.log('  lucia.bianchi@example.com       (UtenteRegistrato)');
  console.log('  info@castellotrento.it          (EnteCertificato approved)');
  console.log('  eventi@sportclubtrento.it       (EnteCertificato approved)');
  console.log('  dashboard@comune.trento.it      (AmministratoreComunale)');
  console.log('  admin@trento-live.it            (AmministratoreDiSistema)');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
