const PDFDocument = require('pdfkit');
const service = require('./dashboard.service');
const { POI } = require('../data/models');

async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    res.json(stats);
  } catch (e) { next(e); }
}

async function getServiceRequestStats(req, res, next) {
  try {
    const data = await service.getServiceRequestStats(req.query);
    res.json(data);
  } catch (e) { next(e); }
}

// ── CSV/PDF rows builders ─────────────────────────────────────────────────

function buildStatsRows(stats) {
  return [
    ['metric', 'value'],
    ['totalActivities', stats.totalActivities],
    ['totalEvents', stats.totalEvents],
    ['totalPOIs', stats.totalPOIs],
    ['totalParticipations', stats.totalParticipations],
    ...stats.activitiesByType.map((r) => [`activities_${r.tipo}`, r.count]),
    ...(stats.eventsByCategory || []).map((r) => [`events_${r.categoria}`, r.count]),
    ...stats.poiCrowding.map((r) => [`poi_${r.statoAffollamento}`, r.count]),
  ];
}

function toCsv(rows) {
  return rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ── Export endpoint ───────────────────────────────────────────────────────

async function exportStats(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const dataset = (req.query.dataset || 'stats').toLowerCase();

    // ── 1. POI snapshot ─────────────────────────────────────────────────
    if (dataset === 'poi_snapshot') {
      const pois = await POI.findAll({ raw: true });

      if (format === 'csv') {
        const header = ['id', 'nome', 'tipo', 'latitudine', 'longitudine', 'capacitaMax', 'statoAffollamento', 'indirizzo'];
        const rows = [header, ...pois.map((p) => header.map((k) => p[k] ?? ''))];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="poi-snapshot.csv"');
        return res.send(toCsv(rows));
      }

      if (format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="poi-snapshot.pdf"');
        doc.pipe(res);
        doc.fontSize(18).text('Trento Live Activity — POI Snapshot', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Generato il ${new Date().toLocaleString('it-IT')}`, { align: 'center' });
        doc.fillColor('black').moveDown(1.5);
        pois.forEach((p, i) => {
          doc.fontSize(12).text(`${i + 1}. ${p.nome}`, { continued: false });
          doc.fontSize(10).fillColor('gray')
            .text(`  Tipo: ${p.tipo || '—'} · Stato: ${p.statoAffollamento} · Capacità: ${p.capacitaMax}`);
          if (p.indirizzo) doc.text(`  Indirizzo: ${p.indirizzo}`);
          doc.fillColor('black').moveDown(0.4);
        });
        doc.end();
        return;
      }
    }

    // ── 2. Citizen needs / service requests ─────────────────────────────
    if (dataset === 'service_requests') {
      const data = await service.getServiceRequestStats(req.query);

      if (format === 'csv') {
        const rows = [['categoria', 'count'], ...data.byCategory.map((r) => [r.categoria, r.count])];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="citizen-needs.csv"');
        return res.send(toCsv(rows));
      }

      if (format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="citizen-needs.pdf"');
        doc.pipe(res);
        doc.fontSize(18).text('Trento Live Activity — Citizen Needs', { align: 'center' });
        doc.fontSize(10).fillColor('gray').text(`Generato il ${new Date().toLocaleString('it-IT')}`, { align: 'center' });
        doc.fillColor('black').moveDown(1.5);
        doc.fontSize(12).text(`Totale segnalazioni: ${data.total}`).moveDown(0.8);
        data.byCategory.forEach((r) => {
          doc.fontSize(11).text(`${r.categoria}: ${r.count}`).moveDown(0.3);
        });
        doc.end();
        return;
      }
    }

    // ── 3. Aggregate stats (default) ─────────────────────────────────────
    const stats = await service.getStats(req.query);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stats.csv"');
      return res.send(toCsv(buildStatsRows(stats)));
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="stats.pdf"');
      doc.pipe(res);

      doc.fontSize(20).text('Trento Live Activity — Statistiche', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('gray').text(`Generato il ${new Date().toLocaleString('it-IT')}`, { align: 'center' });
      doc.fillColor('black').moveDown(1.5);

      if (stats.filters && Object.values(stats.filters).some((v) => v !== undefined && v !== null && v !== '')) {
        doc.fontSize(12).text('Filtri applicati:', { underline: true });
        doc.fontSize(10);
        Object.entries(stats.filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') doc.text(`  • ${k}: ${v}`);
        });
        doc.moveDown(1);
      }

      doc.fontSize(14).text('Metriche aggregate', { underline: true }).moveDown(0.3);
      doc.fontSize(11);
      const headerY = doc.y;
      doc.text('Metrica', 50, headerY, { width: 350 });
      doc.text('Valore', 400, headerY, { width: 100, align: 'right' });
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke().moveDown(0.3);

      buildStatsRows(stats).slice(1).forEach(([label, value]) => {
        const y = doc.y;
        doc.text(String(label), 50, y, { width: 350 });
        doc.text(String(value), 400, y, { width: 100, align: 'right' });
        doc.moveDown(0.4);
      });

      doc.end();
      return;
    }

    res.status(400).json({ error: 'Unsupported format. Use ?format=csv or ?format=pdf', code: 'INVALID_FORMAT' });
  } catch (e) { next(e); }
}

module.exports = { getStats, getServiceRequestStats, exportStats };
