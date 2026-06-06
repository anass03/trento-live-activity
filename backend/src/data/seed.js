/**
 * Seed: popola il DB con i dati minimi per la demo D3.
 *
 * Contenuto:
 *  - 4 amministratori di sistema (i 3 sviluppatori del Gruppo 7 + il docente)
 *  - 2 enti certificati già approvati (Castello del Buonconsiglio, Sport Club Trento)
 *  - 1 amministratore comunale (Comune di Trento, ufficio statistica)
 *  - 16 POI reali di Trento
 *  - 2 UtenteRegistrato (cittadini) di test, già verificati e pronti al login
 *
 * Password unica per tutti gli account: "password123".
 *
 * RNF15: AmministratoreDiSistema richiede 2FA. Nel seed twoFactorEnabled=false,
 * al primo login il backend rilascia un token "needs2faSetup" che porta
 * l'utente al wizard di configurazione TOTP.
 *
 * Esecuzione locale o da Render Shell:
 *   cd backend && node src/data/seed.js
 *
 * Esecuzione dal proprio PC puntando a Supabase (Render free non ha Shell):
 *   export DATABASE_URL='postgresql://postgres.<ref>:<pw-encoded>@aws-...pooler.supabase.com:5432/postgres'
 *   node src/data/seed.js
 *
 * Idempotente: tutto viene troncato e ricreato.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, User, POI, Activity, Event, Participation,
  CittadinoProfile, EnteProfile,
  AmministratoreComunaleProfile, AmministratoreSistemaProfile,
  Favorite, EventParticipation,
} = require('./models');

const PASSWORD = 'password123';

async function seed() {
  await sequelize.authenticate();
  console.log('PostgreSQL connesso');
  await sequelize.sync({ alter: true });

  console.log('Wiping existing data...');
  await Participation.destroy({ where: {}, truncate: true, cascade: true });
  await EventParticipation.destroy({ where: {}, truncate: true, cascade: true });
  await Activity.destroy({ where: {}, truncate: true, cascade: true });
  await Event.destroy({ where: {}, truncate: true, cascade: true });
  await POI.destroy({ where: {}, truncate: true, cascade: true });
  await Favorite.destroy({ where: {}, truncate: true, cascade: true });
  await CittadinoProfile.destroy({ where: {}, truncate: true, cascade: true });
  await EnteProfile.destroy({ where: {}, truncate: true, cascade: true });
  await AmministratoreComunaleProfile.destroy({ where: {}, truncate: true, cascade: true });
  await AmministratoreSistemaProfile.destroy({ where: {}, truncate: true, cascade: true });
  await User.destroy({ where: {}, truncate: true, cascade: true });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ── AMMINISTRATORI DI SISTEMA ─────────────────────────────────────────
  // I 3 sviluppatori del gruppo + il docente. Poteri massimi: gestione utenti,
  // POI, moderazione, approvazione enti.
  // RNF15: al primo login il backend chiede setup 2FA TOTP (twoFactorEnabled=false).
  console.log('Creating amministratori di sistema (4)...');
  const ADMIN_SISTEMA = [
    { email: 'soussaneanas8@gmail.com',          nome: 'Anas',     cognome: 'Soussane',   dataNascita: '2003-04-08', superAdmin: true  },
    { email: 'saifedine.safi@studenti.unitn.it', nome: 'Saifedine', cognome: 'Safi',      dataNascita: '2003-01-01', superAdmin: false },
    { email: 'filippo.mar2004@gmail.com',        nome: 'Filippo',  cognome: 'Marcatili',  dataNascita: '2004-01-01', superAdmin: false },
    { email: 'sandro.fiore@unitn.it',            nome: 'Sandro',   cognome: 'Fiore',      dataNascita: '1970-01-01', superAdmin: false },
  ];

  const adminUsers = await Promise.all(
    ADMIN_SISTEMA.map((a) => User.create({
      email: a.email,
      passwordHash,
      nome: a.nome,
      cognome: a.cognome,
      dataNascita: a.dataNascita,
      ruolo: 'AmministratoreDiSistema',
      emailVerified: true,
      twoFactorEnabled: false, // setup al primo login (RNF15)
    })),
  );

  await Promise.all(
    adminUsers.map((u, i) => AmministratoreSistemaProfile.create({
      userId: u.id,
      nome: ADMIN_SISTEMA[i].nome,
      cognome: ADMIN_SISTEMA[i].cognome,
      superAdmin: ADMIN_SISTEMA[i].superAdmin,
    })),
  );

  // ── ENTI CERTIFICATI ──────────────────────────────────────────────────
  // 2 enti già approvati per la demo (salta il flusso di approvazione admin).
  console.log('Creating enti certificati (2)...');
  const [castello, sportclub] = await Promise.all([
    User.create({
      email: 'info@castellotrento.it',
      passwordHash,
      nome: 'Castello', cognome: 'Buonconsiglio',
      dataNascita: '1990-01-01',
      ruolo: 'EnteCertificato', approvato: true,
      nomeEnte: 'Castello del Buonconsiglio',
      pec: 'castello.buonconsiglio@pec.it',
      emailVerified: true,
    }),
    User.create({
      email: 'eventi@sportclubtrento.it',
      passwordHash,
      nome: 'Sport', cognome: 'Club',
      dataNascita: '1985-03-10',
      ruolo: 'EnteCertificato', approvato: true,
      nomeEnte: 'Sport Club Trento',
      pec: 'sportclub.trento@pec.it',
      emailVerified: true,
    }),
  ]);

  await Promise.all([
    EnteProfile.create({
      userId: castello.id,
      nomeEnte: 'Castello del Buonconsiglio',
      pec: 'castello.buonconsiglio@pec.it',
      approvato: true,
    }),
    EnteProfile.create({
      userId: sportclub.id,
      nomeEnte: 'Sport Club Trento',
      pec: 'sportclub.trento@pec.it',
      approvato: true,
    }),
  ]);

  // ── AMMINISTRATORE COMUNALE ───────────────────────────────────────────
  // Account "Comune di Trento" per la dashboard analitica (RF27+, OCL C25).
  console.log('Creating amministratore comunale (1)...');
  const comune = await User.create({
    email: 'dashboard@comune.trento.it',
    passwordHash,
    nome: 'Comune', cognome: 'Trento',
    dataNascita: '1980-01-01',
    ruolo: 'AmministratoreComunale',
    emailVerified: true,
  });
  await AmministratoreComunaleProfile.create({
    userId: comune.id,
    nome: 'Maria',
    cognome: 'Bianchi',
    ufficio: 'Ufficio Statistica e Open Data',
    spidId: 'SPID-TN-0001',
  });

  // ── UTENTI REGISTRATI (CITTADINI) DI TEST ─────────────────────────────
  // 2 cittadini pronti all'uso per i test: email già verificata e onboarding
  // completato, così si può fare login subito con "password123" senza passare
  // dal flusso di verifica email / scelta interessi.
  console.log('Creating utenti registrati di test (2)...');
  const CITTADINI = [
    {
      email: 'mario.rossi@test.it', nome: 'Mario', cognome: 'Rossi',
      dataNascita: '1995-06-15', codiceFiscale: 'RSSMRA95H15L378X',
      interessi: ['cultura', 'sport'],
    },
    {
      email: 'giulia.bianchi@test.it', nome: 'Giulia', cognome: 'Bianchi',
      dataNascita: '1998-09-23', codiceFiscale: 'BNCGLI98P63L378K',
      interessi: ['musica', 'enogastronomia'],
    },
  ];

  await Promise.all(CITTADINI.map(async (c) => {
    const u = await User.create({
      email: c.email,
      passwordHash,
      nome: c.nome,
      cognome: c.cognome,
      dataNascita: c.dataNascita,
      codiceFiscale: c.codiceFiscale,
      ruolo: 'UtenteRegistrato',
      interessi: c.interessi,
      emailVerified: true,
    });
    await CittadinoProfile.create({
      userId: u.id,
      nome: c.nome,
      cognome: c.cognome,
      dataNascita: c.dataNascita,
      codiceFiscale: c.codiceFiscale,
      interessi: c.interessi,
      onboardingComplete: true,
    });
  }));

  // ── POI di Trento (dati pubblici della città) ─────────────────────────
  console.log('Creating POIs (Trento)...');
  await Promise.all([
    POI.create({ nome: 'Piazza Duomo', latitudine: 46.0664, longitudine: 11.1216, capacitaMax: 2000, statoAffollamento: 'giallo', tipo: 'piazza', descrizione: 'Cuore storico della città, fontana del Nettuno e Cattedrale di San Vigilio' }),
    POI.create({ nome: 'Castello del Buonconsiglio', latitudine: 46.0719, longitudine: 11.1234, capacitaMax: 500, statoAffollamento: 'verde', tipo: 'monumento', descrizione: 'Castello medievale con la Torre Aquila e gli affreschi del Ciclo dei Mesi' }),
    POI.create({ nome: 'Stadio Briamasco', latitudine: 46.0631, longitudine: 11.1100, capacitaMax: 4500, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Stadio cittadino, casa del Trento Calcio 1921' }),
    POI.create({ nome: 'MUSE - Museo delle Scienze', latitudine: 46.0666, longitudine: 11.1130, capacitaMax: 800, statoAffollamento: 'rosso', tipo: 'museo', descrizione: 'Museo delle Scienze progettato da Renzo Piano' }),
    POI.create({ nome: 'Parco delle Albere', latitudine: 46.0670, longitudine: 11.1145, capacitaMax: 1500, statoAffollamento: 'giallo', tipo: 'parco', descrizione: 'Grande parco urbano vicino al MUSE' }),
    POI.create({ nome: 'Doss Trento', latitudine: 46.0750, longitudine: 11.1100, capacitaMax: 300, statoAffollamento: 'verde', tipo: 'panoramico', descrizione: 'Collina panoramica con vista sulla città' }),
    POI.create({ nome: 'Piazza Fiera', latitudine: 46.0664, longitudine: 11.1227, capacitaMax: 1000, statoAffollamento: 'verde', tipo: 'piazza', descrizione: 'Piazza tradizionale di Trento' }),
    POI.create({ nome: 'Biblioteca Universitaria', latitudine: 46.0680, longitudine: 11.1250, capacitaMax: 400, statoAffollamento: 'giallo', tipo: 'biblioteca', descrizione: 'Biblioteca di Lettere e Filosofia' }),
    // Parcheggi
    POI.create({ nome: 'Parcheggio Buonconsiglio', latitudine: 46.0722, longitudine: 11.1245, capacitaMax: 320, statoAffollamento: 'rosso', tipo: 'parcheggio', descrizione: 'Parcheggio multipiano centro storico' }),
    POI.create({ nome: 'Parcheggio Centro Europa', latitudine: 46.0686, longitudine: 11.1186, capacitaMax: 480, statoAffollamento: 'giallo', tipo: 'parcheggio', descrizione: 'Parcheggio interrato' }),
    POI.create({ nome: 'Parcheggio Zuffo (Park & Ride)', latitudine: 46.0820, longitudine: 11.1050, capacitaMax: 850, statoAffollamento: 'verde', tipo: 'parcheggio', descrizione: 'Park & Ride a nord, navetta verso il centro' }),
    // Università
    POI.create({ nome: 'Università di Trento — Dipartimento Lettere', latitudine: 46.0671, longitudine: 11.1212, capacitaMax: 600, statoAffollamento: 'giallo', tipo: 'universita', descrizione: 'Polo umanistico Lettere e Filosofia' }),
    POI.create({ nome: 'Polo Scientifico Povo', latitudine: 46.0666, longitudine: 11.1503, capacitaMax: 1200, statoAffollamento: 'rosso', tipo: 'universita', descrizione: 'Aule e laboratori DISI / Fisica' }),
    POI.create({ nome: 'Mesiano — Ingegneria', latitudine: 46.0676, longitudine: 11.1481, capacitaMax: 800, statoAffollamento: 'giallo', tipo: 'universita', descrizione: 'Facoltà di Ingegneria Civile/Ambientale/Meccanica' }),
    // Trasporti
    POI.create({ nome: 'Stazione FS Trento', latitudine: 46.0707, longitudine: 11.1196, capacitaMax: 2500, statoAffollamento: 'giallo', tipo: 'stazione', descrizione: 'Stazione ferroviaria principale' }),
    POI.create({ nome: 'Funivia Sardagna', latitudine: 46.0686, longitudine: 11.1175, capacitaMax: 60, statoAffollamento: 'verde', tipo: 'trasporto', descrizione: 'Funivia panoramica da Trento a Sardagna' }),
  ]);

  // ── POI universitari: strutture sportive + biblioteche/sale studio ─────
  // Coordinate ottenute via geocoding degli indirizzi ufficiali (Google Maps
  // Geocoding quando MAPS_API_KEY è settata, altrimenti Nominatim — vedi
  // src/lib/forwardGeocode.js e scripts/seed-university-pois.js).
  console.log('Creating POI universitari (sport + biblioteche)...');
  await Promise.all([
    // Strutture sportive (CUS / impianti universitari)
    POI.create({ nome: 'Centro Nautico Universitario Augsburgerhof', latitudine: 46.039009, longitudine: 11.235117, capacitaMax: 120, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Centro nautico universitario sul Lago di Caldonazzo', indirizzo: 'Via alla Spiaggetta 7, Pergine Valsugana (TN)' }),
    POI.create({ nome: 'Centro Sportivo Universitario di Mattarello', latitudine: 46.010188, longitudine: 11.135499, capacitaMax: 300, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Impianti sportivi universitari a Mattarello', indirizzo: 'Via delle Regole, Mattarello (TN)' }),
    POI.create({ nome: 'Palestra di Sociologia', latitudine: 46.066414, longitudine: 11.119706, capacitaMax: 80, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Palestra universitaria - Dipartimento di Sociologia', indirizzo: 'Via Verdi 26, 38122 Trento' }),
    POI.create({ nome: 'Residenza Santa Margherita', latitudine: 46.068255, longitudine: 11.117367, capacitaMax: 150, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Residenza universitaria con spazi sportivi/fitness', indirizzo: 'Via Santa Margherita 3, 38122 Trento' }),
    POI.create({ nome: 'San Bartolameo - Sanbàpolis Gialla', latitudine: 46.047922, longitudine: 11.134646, capacitaMax: 200, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Polo sportivo Sanbàpolis - palestra Gialla', indirizzo: 'Via della Malpensada 82/A, 38123 Trento' }),
    POI.create({ nome: 'San Bartolameo - Sanbàpolis Rossa', latitudine: 46.047822, longitudine: 11.134746, capacitaMax: 200, statoAffollamento: 'verde', tipo: 'impianto_sportivo', descrizione: 'Polo sportivo Sanbàpolis - palestra Rossa', indirizzo: 'Via della Malpensada 82/A, 38123 Trento' }),
    // Biblioteche / sale studio
    POI.create({ nome: 'BUC - Biblioteca Universitaria Centrale', latitudine: 46.059595, longitudine: 11.115535, capacitaMax: 600, statoAffollamento: 'giallo', tipo: 'biblioteca', descrizione: 'Biblioteca Universitaria Centrale (Le Albere)', indirizzo: 'Via Adalberto Libera 3, Trento' }),
    POI.create({ nome: 'BUM - Biblioteca Universitaria Mesiano', latitudine: 46.065585, longitudine: 11.139632, capacitaMax: 250, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Universitaria - polo di Ingegneria (Mesiano)', indirizzo: 'Via Mesiano 77, Trento' }),
    POI.create({ nome: 'BUP - Biblioteca Universitaria Povo', latitudine: 46.067099, longitudine: 11.150229, capacitaMax: 300, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Universitaria - polo scientifico di Povo', indirizzo: 'Via Sommarive 5, Povo, Trento' }),
    POI.create({ nome: 'BUR - Biblioteca Universitaria Rovereto', latitudine: 45.893652, longitudine: 11.043539, capacitaMax: 200, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Universitaria - polo di Rovereto', indirizzo: 'Corso Bettini 84, Rovereto (TN)' }),
    POI.create({ nome: 'Sala studio Cavazzani', latitudine: 46.066541, longitudine: 11.114845, capacitaMax: 120, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Sala studio universitaria Cavazzani', indirizzo: 'Via Verdi 8, 38122 Trento' }),
    POI.create({ nome: 'Salette studio collettivo DEM', latitudine: 46.065822, longitudine: 11.117573, capacitaMax: 100, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Salette studio collettivo - Dip. Economia e Management', indirizzo: 'Via Inama 5, 38122 Trento' }),
    POI.create({ nome: 'Biblioteca Diocesana Vigilianum', latitudine: 46.061600, longitudine: 11.122031, capacitaMax: 90, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Diocesana Vigilianum', indirizzo: 'Via Endrici 14, 38122 Trento' }),
    POI.create({ nome: 'Biblioteca FBK', latitudine: 46.062798, longitudine: 11.123997, capacitaMax: 80, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Fondazione Bruno Kessler', indirizzo: 'Via Santa Croce 77, 38122 Trento' }),
    POI.create({ nome: 'Biblioteca FEM (Fondazione Edmund Mach)', latitudine: 46.193406, longitudine: 11.133942, capacitaMax: 120, statoAffollamento: 'verde', tipo: 'biblioteca', descrizione: 'Biblioteca Fondazione Edmund Mach', indirizzo: 'Via Edmund Mach 1, 38098 San Michele all\'Adige (TN)' }),
  ]);

  // ── Riepilogo ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Seed completato con successo');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`\n  Password unica per tutti gli account: "${PASSWORD}"\n`);
  console.log('  Amministratori di sistema (poteri massimi):');
  ADMIN_SISTEMA.forEach((a) => {
    const tag = a.superAdmin ? '  ★ SUPER ADMIN' : '';
    console.log(`    ${a.email.padEnd(38)}  ${a.nome} ${a.cognome}${tag}`);
  });
  console.log('\n  Enti certificati (EnteCertificato, già approvati):');
  console.log('    info@castellotrento.it                 Castello del Buonconsiglio');
  console.log('    eventi@sportclubtrento.it              Sport Club Trento');
  console.log('\n  Amministratore comunale (dashboard analitica):');
  console.log('    dashboard@comune.trento.it             Comune di Trento');
  console.log('\n  Utenti registrati (cittadini di test, login immediato):');
  CITTADINI.forEach((c) => {
    console.log(`    ${c.email.padEnd(38)}  ${c.nome} ${c.cognome}`);
  });
  console.log('\n  POI: 31 punti di interesse (16 città + 6 strutture sportive + 9 biblioteche/sale studio).');
  console.log('══════════════════════════════════════════════════════════\n');
  console.log('  Al primo login degli AmministratoreDiSistema verrà richiesto');
  console.log('  di configurare il 2FA (RNF15). Procedura:');
  console.log('    1. Login con email + password "password123"');
  console.log('    2. Wizard 2FA: scansiona QR con app authenticator (Google/Authy/1Password)');
  console.log('    3. Inserisci il codice 6 cifre per attivare');
  console.log('    4. Salva i 8 recovery code mostrati una sola volta\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
