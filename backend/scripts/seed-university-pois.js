/*
 * Aggiunge i POI universitari (strutture sportive + biblioteche/sale studio)
 * a un database ESISTENTE, senza troncare nulla (a differenza di src/data/seed.js).
 *
 * Le coordinate vengono recuperate automaticamente via geocoding degli indirizzi
 * ufficiali: Google Maps Geocoding API quando MAPS_API_KEY è settata, altrimenti
 * OpenStreetMap Nominatim (gratuito). Se il geocoding fallisce per un indirizzo,
 * si usano le coordinate di fallback note (lat/lng nel record).
 *
 * Idempotente: upsert per nome (aggiorna il POI se esiste già).
 *
 * Uso:
 *   node scripts/seed-university-pois.js
 *   MAPS_API_KEY=... node scripts/seed-university-pois.js   # via Google Maps
 */
require('dotenv').config();
const { sequelize, POI } = require('../src/data/models');
const { forwardGeocode } = require('../src/lib/forwardGeocode');

// indirizzo = stringa da geocodificare; lat/lng = fallback già verificati.
const UNIVERSITY_POIS = [
  // Strutture sportive
  { nome: 'Centro Nautico Universitario Augsburgerhof', tipo: 'impianto_sportivo', capacitaMax: 120, indirizzo: 'Via alla Spiaggetta 7, Pergine Valsugana (TN)', lat: 46.039009, lng: 11.235117, descrizione: 'Centro nautico universitario sul Lago di Caldonazzo' },
  { nome: 'Centro Sportivo Universitario di Mattarello', tipo: 'impianto_sportivo', capacitaMax: 300, indirizzo: 'Via delle Regole, Mattarello (TN)', lat: 46.010188, lng: 11.135499, descrizione: 'Impianti sportivi universitari a Mattarello' },
  { nome: 'Palestra di Sociologia', tipo: 'impianto_sportivo', capacitaMax: 80, indirizzo: 'Via Verdi 26, 38122 Trento', lat: 46.066414, lng: 11.119706, descrizione: 'Palestra universitaria - Dipartimento di Sociologia' },
  { nome: 'Residenza Santa Margherita', tipo: 'impianto_sportivo', capacitaMax: 150, indirizzo: 'Via Santa Margherita 3, 38122 Trento', lat: 46.068255, lng: 11.117367, descrizione: 'Residenza universitaria con spazi sportivi/fitness' },
  { nome: 'San Bartolameo - Sanbàpolis Gialla', tipo: 'impianto_sportivo', capacitaMax: 200, indirizzo: 'Via della Malpensada 82/A, 38123 Trento', lat: 46.047922, lng: 11.134646, descrizione: 'Polo sportivo Sanbàpolis - palestra Gialla' },
  { nome: 'San Bartolameo - Sanbàpolis Rossa', tipo: 'impianto_sportivo', capacitaMax: 200, indirizzo: 'Via della Malpensada 82/A, 38123 Trento', lat: 46.047822, lng: 11.134746, descrizione: 'Polo sportivo Sanbàpolis - palestra Rossa' },
  // Biblioteche / sale studio
  { nome: 'BUC - Biblioteca Universitaria Centrale', tipo: 'biblioteca', capacitaMax: 600, indirizzo: 'Via Adalberto Libera 3, Trento', lat: 46.059595, lng: 11.115535, descrizione: 'Biblioteca Universitaria Centrale (Le Albere)', statoAffollamento: 'giallo' },
  { nome: 'BUM - Biblioteca Universitaria Mesiano', tipo: 'biblioteca', capacitaMax: 250, indirizzo: 'Via Mesiano 77, Trento', lat: 46.065585, lng: 11.139632, descrizione: 'Biblioteca Universitaria - polo di Ingegneria (Mesiano)' },
  { nome: 'BUP - Biblioteca Universitaria Povo', tipo: 'biblioteca', capacitaMax: 300, indirizzo: 'Via Sommarive 5, Povo, Trento', lat: 46.067099, lng: 11.150229, descrizione: 'Biblioteca Universitaria - polo scientifico di Povo' },
  { nome: 'BUR - Biblioteca Universitaria Rovereto', tipo: 'biblioteca', capacitaMax: 200, indirizzo: 'Corso Bettini 84, Rovereto (TN)', lat: 45.893652, lng: 11.043539, descrizione: 'Biblioteca Universitaria - polo di Rovereto' },
  { nome: 'Sala studio Cavazzani', tipo: 'biblioteca', capacitaMax: 120, indirizzo: 'Via Verdi 8, 38122 Trento', lat: 46.066541, lng: 11.114845, descrizione: 'Sala studio universitaria Cavazzani' },
  { nome: 'Salette studio collettivo DEM', tipo: 'biblioteca', capacitaMax: 100, indirizzo: 'Via Inama 5, 38122 Trento', lat: 46.065822, lng: 11.117573, descrizione: 'Salette studio collettivo - Dip. Economia e Management' },
  { nome: 'Biblioteca Diocesana Vigilianum', tipo: 'biblioteca', capacitaMax: 90, indirizzo: 'Via Endrici 14, 38122 Trento', lat: 46.061600, lng: 11.122031, descrizione: 'Biblioteca Diocesana Vigilianum' },
  { nome: 'Biblioteca FBK', tipo: 'biblioteca', capacitaMax: 80, indirizzo: 'Via Santa Croce 77, 38122 Trento', lat: 46.062798, lng: 11.123997, descrizione: 'Biblioteca Fondazione Bruno Kessler' },
  { nome: 'Biblioteca FEM (Fondazione Edmund Mach)', tipo: 'biblioteca', capacitaMax: 120, indirizzo: "Via Edmund Mach 1, 38098 San Michele all'Adige (TN)", lat: 46.193406, lng: 11.133942, descrizione: 'Biblioteca Fondazione Edmund Mach' },
];

async function run() {
  await sequelize.authenticate();
  console.log('PostgreSQL connesso. Upsert POI universitari…\n');

  let created = 0; let updated = 0;
  for (const p of UNIVERSITY_POIS) {
    // 1) prova a geocodificare l'indirizzo (Google → Nominatim)
    let lat = p.lat; let lng = p.lng; let source = 'fallback';
    const geo = await forwardGeocode(p.indirizzo);
    if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
      lat = geo.lat; lng = geo.lng; source = geo.provider;
    }

    const payload = {
      nome: p.nome,
      latitudine: lat,
      longitudine: lng,
      capacitaMax: p.capacitaMax,
      statoAffollamento: p.statoAffollamento || 'verde',
      tipo: p.tipo,
      descrizione: p.descrizione,
      indirizzo: p.indirizzo,
    };

    const existing = await POI.findOne({ where: { nome: p.nome } });
    if (existing) {
      await existing.update(payload);
      updated += 1;
      console.log(`  ↻ updated  ${p.nome}  (${lat.toFixed(5)}, ${lng.toFixed(5)} via ${source})`);
    } else {
      await POI.create(payload);
      created += 1;
      console.log(`  + created  ${p.nome}  (${lat.toFixed(5)}, ${lng.toFixed(5)} via ${source})`);
    }
  }

  console.log(`\n✓ Done. ${created} creati, ${updated} aggiornati (${UNIVERSITY_POIS.length} totali).`);
  await sequelize.close();
}

run().catch((err) => {
  console.error('Errore:', err);
  process.exit(1);
});
