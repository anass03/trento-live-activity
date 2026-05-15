const PDFDocument = require('pdfkit');
const service = require('./dashboard.service');

async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    res.json(stats);
  } catch (e) { next(e); }
}

function buildRows(stats) {
  // Solo metriche aggregate (#15): mai numero utenti.
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

async function exportStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    const format = (req.query.format || 'csv').toLowerCase();

    if (format === 'csv') {
      const rows = buildRows(stats);
      const csv = rows.map((r) => r.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stats.csv"');
      return res.send(csv);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="stats.pdf"');
      doc.pipe(res);

      doc.fontSize(20).text('Trento Live Activity — Statistiche', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('gray').text(`Generato il ${new Date().toLocaleString('it-IT')}`, { align: 'center' });
      doc.fillColor('black');
      doc.moveDown(1.5);

      if (stats.filters && Object.values(stats.filters).some((v) => v !== undefined && v !== null && v !== '')) {
        doc.fontSize(12).text('Filtri applicati:', { underline: true });
        doc.fontSize(10);
        Object.entries(stats.filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') doc.text(`  • ${k}: ${v}`);
        });
        doc.moveDown(1);
      }

      doc.fontSize(14).text('Metriche aggregate', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11);
      const headerY = doc.y;
      doc.text('Metrica', 50, headerY, { width: 350 });
      doc.text('Valore', 400, headerY, { width: 100, align: 'right' });
      doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
      doc.moveDown(0.3);

      buildRows(stats).slice(1).forEach(([label, value]) => {
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

module.exports = { getStats, exportStats };
