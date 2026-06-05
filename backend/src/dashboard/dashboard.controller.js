const PDFDocument = require('pdfkit');
const service = require('./dashboard.service');
const { POI } = require('../data/models');

// ── Palette (mirrors app CSS vars, adapted for PDF) ───────────────────────
const C = {
  headerBg:   '#0f5132',
  headerText: '#ffffff',
  primary:    '#16a34a',
  primaryBg:  '#f0fdf4',
  primaryBd:  '#bbf7d0',
  accent2:    '#2563eb',   // activities
  accent3:    '#d97706',   // warnings
  danger:     '#dc2626',
  warning:    '#d97706',
  success:    '#16a34a',
  text:       '#111827',
  muted:      '#6b7280',
  border:     '#e5e7eb',
  rowOdd:     '#f9fafb',
  sectionBg:  '#f0fdf4',
};

// Crowding status → PDF color
const CROWD_COLOR = { rosso: C.danger, giallo: C.warning, verde: C.success };

// Activity type → color (cycles through palette)
const TYPE_COLORS = ['#16a34a','#2563eb','#d97706','#9333ea','#0891b2','#be185d'];

// Mirrors frontend POI_KEYWORDS for supply/demand
const POI_KEYWORDS = {
  sport:       ['sport','campo','piscina','palest','stadio','gym','fitness','calcio'],
  cultura:     ['cultur','museo','teatro','galleri','bibliote','mostra'],
  musica:      ['music','concert','auditor','sala'],
  studio:      ['studi','bibliote','univer','aula','cowork','scuola'],
  arte:        ['arte','atelier','galleri'],
  gastronomia: ['gastro','mercato','ristor','bar ','café','cafe','food'],
};

function matchPOICount(tipo, poiByType) {
  const keys = POI_KEYWORDS[tipo] ?? [tipo];
  return poiByType
    .filter((p) => p.tipo && keys.some((k) => String(p.tipo).toLowerCase().includes(k)))
    .reduce((s, p) => s + Number(p.count), 0);
}

// ── CSV helpers ───────────────────────────────────────────────────────────

function toCsv(rows) {
  return rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function buildMultiSectionCsv(sections) {
  const parts = [];
  for (const { title, headers, rows } of sections) {
    parts.push(`# ${title}`);
    parts.push(toCsv([headers, ...rows]));
    parts.push('');
  }
  return parts.join('\n');
}

// ── PDF drawing helpers ───────────────────────────────────────────────────

const M = 50; // margin
const PW = 495; // printable width (A4=595 - 2×50)

/** Colored full-width header band */
function pdfCoverBand(doc, title, subtitle, dateStr, filtersStr) {
  const bandH = filtersStr ? 110 : 92;
  doc.rect(0, 0, 595, bandH).fill(C.headerBg);
  doc.fontSize(7).font('Helvetica').fillColor('rgba(255,255,255,0.55)')
    .text('COMUNE DI TRENTO · TRENTO LIVE ACTIVITY', M, 16, { width: PW, align: 'center' });
  doc.fontSize(18).font('Helvetica-Bold').fillColor(C.headerText)
    .text(title, M, 28, { width: PW, align: 'center' });
  if (subtitle) {
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.72)')
      .text(subtitle, M, 52, { width: PW, align: 'center' });
  }
  doc.fontSize(8).fillColor('rgba(255,255,255,0.55)')
    .text(dateStr, M, 66, { width: PW, align: 'center' });
  if (filtersStr) {
    doc.fontSize(8).fillColor('rgba(255,255,255,0.65)')
      .text(`Filtri: ${filtersStr}`, M, 82, { width: PW, align: 'center' });
  }
  doc.y = bandH + 20;
  doc.font('Helvetica').fillColor(C.text);
}

/** Section heading with colored left bar */
function pdfSectionHeading(doc, text, color) {
  const y = doc.y;
  doc.rect(M, y, 4, 16).fill(color || C.primary);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(C.text)
    .text(text, M + 10, y + 2, { width: PW - 10 });
  doc.font('Helvetica').moveDown(0.6);
}

/** Divider between visual summary and detail sections */
function pdfDetailSectionBanner(doc, text) {
  const y = doc.y + 4;
  doc.rect(0, y, 595, 28).fill(C.sectionBg);
  doc.rect(0, y, 595, 1).fill(C.primaryBd);
  doc.rect(0, y + 27, 595, 1).fill(C.primaryBd);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.primary)
    .text(text.toUpperCase(), M, y + 9, { width: PW });
  doc.font('Helvetica').fillColor(C.text);
  doc.y = y + 38;
}

/** Draw 4 KPI boxes in a single row */
function pdfKPIBoxes(doc, items) {
  const n = items.length;
  const gap = 8;
  const boxW = Math.floor((PW - gap * (n - 1)) / n);
  const boxH = 68;
  const startY = doc.y;
  const startX = M;

  items.forEach((item, i) => {
    const x = startX + i * (boxW + gap);
    doc.roundedRect(x, startY, boxW, boxH, 8).fill(item.bg || C.primaryBg);
    doc.roundedRect(x, startY, boxW, boxH, 8).strokeColor(item.border || C.primaryBd).lineWidth(1).stroke();
    doc.fontSize(26).font('Helvetica-Bold').fillColor(item.color || C.headerBg)
      .text(String(item.value), x + 4, startY + 12, { width: boxW - 8, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor(C.muted)
      .text(item.label, x + 4, startY + boxH - 20, { width: boxW - 8, align: 'center' });
  });

  doc.fillColor(C.text).y = startY + boxH + 14;
}

/** Horizontal bar chart (up to maxRows rows) */
function pdfBarChart(doc, rows, maxRows, colorFn) {
  if (!rows || rows.length === 0) return;
  const maxCount = Math.max(...rows.map((r) => Number(r.count)), 1);
  const barMaxW = PW - 160 - 36;  // label(160) + count(36)
  const barH = 12;
  const rowH = 20;
  let y = doc.y;

  rows.slice(0, maxRows || 8).forEach((row, i) => {
    const barW = Math.max(4, (Number(row.count) / maxCount) * barMaxW);
    const color = colorFn ? colorFn(row, i) : TYPE_COLORS[i % TYPE_COLORS.length];

    doc.fontSize(9).font('Helvetica').fillColor(C.text)
      .text(String(row.label || row.tipo || row.categoria || '—'), M, y + 1, { width: 155, ellipsis: true });
    doc.rect(M + 160, y + 1, barW, barH).fill(color);
    doc.fontSize(9).fillColor(C.muted)
      .text(String(row.count), M + 160 + barMaxW + 6, y + 1, { width: 30, align: 'right' });
    y += rowH;
  });

  doc.y = y + 6;
}

/** Stacked horizontal bar + legend (for crowding) */
function pdfStackedBar(doc, segments) {
  if (!segments || segments.length === 0) return;
  const total = segments.reduce((s, r) => s + Number(r.count), 0);
  if (total === 0) return;
  const barH = 20;
  const y = doc.y;
  let x = M;

  segments.forEach((seg) => {
    const w = Math.max(2, (Number(seg.count) / total) * PW);
    const color = CROWD_COLOR[seg.stato] || C.muted;
    doc.rect(x, y, w, barH).fill(color);
    // Label inside if wide enough
    if (w > 30) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff')
        .text(String(seg.count), x + 2, y + 5, { width: w - 4, align: 'center' });
    }
    x += w;
  });

  // Legend row
  let lx = M;
  doc.y = y + barH + 4;
  segments.forEach((seg) => {
    const color = CROWD_COLOR[seg.stato] || C.muted;
    doc.rect(lx, doc.y + 3, 10, 10).fill(color);
    doc.fontSize(8).font('Helvetica').fillColor(C.text)
      .text(`${seg.stato} (${seg.count})`, lx + 13, doc.y, { width: 90 });
    lx += 110;
  });
  doc.moveDown(1.2);
}

/** Professional detail table */
function pdfTable(doc, headers, rows, colWidths) {
  if (!rows || rows.length === 0) {
    doc.fontSize(9).fillColor(C.muted).text('— Nessun dato —').moveDown(0.4);
    return;
  }
  const totalW = colWidths.reduce((s, w) => s + w, 0);

  // Header row
  const hdrY = doc.y;
  doc.rect(M, hdrY, totalW, 18).fill(C.headerBg);
  let x = M;
  doc.fontSize(8).font('Helvetica-Bold').fillColor(C.headerText);
  headers.forEach((h, i) => {
    doc.text(String(h), x + 4, hdrY + 5, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'right' });
    x += colWidths[i];
  });
  doc.font('Helvetica').fillColor(C.text);
  doc.y = hdrY + 20;

  rows.forEach((row, ri) => {
    if (doc.y > 760) { doc.addPage(); }
    const rowY = doc.y;
    const rowH = 15;
    if (ri % 2 === 0) doc.rect(M, rowY, totalW, rowH).fill(C.rowOdd);
    x = M;
    doc.fontSize(8).fillColor(C.text);
    row.forEach((cell, i) => {
      doc.text(String(cell ?? '—'), x + 4, rowY + 3, {
        width: colWidths[i] - 8,
        align: i === 0 ? 'left' : 'right',
        lineBreak: false,
      });
      x += colWidths[i];
    });
    doc.y = rowY + rowH;
  });

  doc.strokeColor(C.border).lineWidth(0.5)
    .moveTo(M, doc.y).lineTo(M + totalW, doc.y).stroke();
  doc.lineWidth(1).strokeColor(C.text);
  doc.moveDown(0.8);
}

// ── Route handlers ────────────────────────────────────────────────────────

async function getStats(req, res, next) {
  try { res.json(await service.getStats(req.query)); }
  catch (e) { next(e); }
}

async function getServiceRequestStats(req, res, next) {
  try { res.json(await service.getServiceRequestStats(req.query)); }
  catch (e) { next(e); }
}

// ── Export endpoint ───────────────────────────────────────────────────────

async function exportStats(req, res, next) {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const datasetsParam = req.query.datasets || req.query.dataset || 'kpi';
    const selected = new Set(datasetsParam.split(',').map((s) => s.trim()).filter(Boolean));

    const needsStats = ['kpi', 'activities', 'poi_crowding', 'supply_demand'].some((d) => selected.has(d));
    const needsPOIs  = selected.has('poi_inventory');
    const needsNeeds = selected.has('citizen_needs');

    const [stats, pois, needs] = await Promise.all([
      needsStats ? service.getStats(req.query) : Promise.resolve(null),
      needsPOIs  ? POI.findAll({ raw: true, order: [['statoAffollamento', 'DESC']] }) : Promise.resolve(null),
      needsNeeds ? service.getServiceRequestStats(req.query) : Promise.resolve(null),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const datasetSlug = [...selected].sort().join('+');

    // ── CSV ──────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const sections = [];

      if (selected.has('kpi') && stats) {
        sections.push({
          title: 'KPI E RIEPILOGO',
          headers: ['metrica', 'valore'],
          rows: [
            ['Attività totali', stats.totalActivities],
            ['Eventi certificati', stats.totalEvents],
            ['Punti di interesse', stats.totalPOIs],
            ['Partecipazioni', stats.totalParticipations],
            ...(stats.eventsByCategory || []).map((r) => [`eventi_${r.categoria}`, r.count]),
          ],
        });
      }

      if (selected.has('activities') && stats) {
        sections.push({ title: 'ATTIVITÀ PER TIPO', headers: ['tipo', 'conteggio'], rows: stats.activitiesByType.map((r) => [r.tipo, r.count]) });
        if ((stats.activitiesByDay || []).length > 0)
          sections.push({ title: 'TREND 14 GIORNI', headers: ['data', 'nuove_attivita'], rows: stats.activitiesByDay.map((r) => [r.date, r.count]) });
        if ((stats.activitiesByHour || []).length > 0)
          sections.push({ title: 'ORE DI PUNTA', headers: ['ora', 'conteggio'], rows: stats.activitiesByHour.map((r) => [`${r.hour}:00`, r.count]) });
      }

      if (selected.has('poi_crowding') && stats) {
        sections.push({ title: 'AFFOLLAMENTO POI', headers: ['stato', 'conteggio'], rows: stats.poiCrowding.map((r) => [r.statoAffollamento, r.count]) });
        sections.push({ title: 'TOP POI PIÙ AFFOLLATI', headers: ['nome', 'tipo', 'stato', 'capacita_max'], rows: (stats.topCrowdedPOIs || []).map((p) => [p.nome, p.tipo || '—', p.statoAffollamento, p.capacitaMax]) });
      }

      if (selected.has('poi_inventory') && pois) {
        sections.push({ title: 'INVENTARIO POI', headers: ['id', 'nome', 'tipo', 'latitudine', 'longitudine', 'capacita_max', 'stato', 'indirizzo'], rows: pois.map((p) => [p.id, p.nome, p.tipo || '—', p.latitudine, p.longitudine, p.capacitaMax, p.statoAffollamento, p.indirizzo || '—']) });
      }

      if (selected.has('supply_demand') && stats) {
        const poiByType = stats.poiByType || [];
        sections.push({
          title: 'ANALISI DOMANDA/OFFERTA',
          headers: ['categoria', 'domanda', 'offerta_poi', 'rapporto'],
          rows: stats.activitiesByType.map((r) => {
            const supply = matchPOICount(r.tipo, poiByType);
            return [r.tipo, r.count, supply, supply > 0 ? `${(Number(r.count) / supply).toFixed(2)}x` : `${r.count}x`];
          }).sort((a, b) => parseFloat(b[3]) - parseFloat(a[3])),
        });
        sections.push({ title: 'POI PER TIPO', headers: ['tipo', 'conteggio'], rows: poiByType.map((r) => [r.tipo || '—', r.count]) });
      }

      if (selected.has('citizen_needs') && needs) {
        sections.push({ title: `SEGNALAZIONI PER CATEGORIA (totale: ${needs.total})`, headers: ['categoria', 'segnalazioni'], rows: needs.byCategory.map((r) => [r.categoria, r.count]) });
        if ((needs.bySubcategory || []).length > 0)
          sections.push({ title: 'SEGNALAZIONI PER SOTTOCATEGORIA', headers: ['categoria', 'sottocategoria', 'segnalazioni'], rows: needs.bySubcategory.map((r) => [r.categoria, r.sottocategoria, r.count]) });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="trento-live-${dateStr}-${datasetSlug}.csv"`);
      return res.send(buildMultiSectionCsv(sections));
    }

    // ── PDF ──────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: M, autoFirstPage: true });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="trento-live-${dateStr}-${datasetSlug}.pdf"`);
      doc.pipe(res);

      const dsLabels = { kpi: 'KPI', activities: 'Attività', poi_crowding: 'Affollamento POI', poi_inventory: 'Inventario POI', supply_demand: 'Domanda/Offerta', citizen_needs: 'Segnalazioni' };
      const subtitle = [...selected].map((d) => dsLabels[d] ?? d).join(' · ');
      const filtersStr = stats?.filters
        ? Object.entries(stats.filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')
        : null;

      // ────────────────────── SECTION 1: VISUAL SUMMARY ─────────────────
      pdfCoverBand(doc, 'Export Report', subtitle, `Generato il ${new Date().toLocaleString('it-IT')}`, filtersStr);

      // KPI boxes
      if (selected.has('kpi') && stats) {
        pdfSectionHeading(doc, 'Riepilogo', C.primary);
        const kpiColors = [
          { bg: '#f0fdf4', border: '#bbf7d0', color: C.headerBg },
          { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
          { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
          { bg: '#fdf4ff', border: '#e9d5ff', color: '#6b21a8' },
        ];
        pdfKPIBoxes(doc, [
          { value: stats.totalActivities,    label: 'Attività',      ...kpiColors[0] },
          { value: stats.totalEvents,         label: 'Eventi cert.',  ...kpiColors[1] },
          { value: stats.totalPOIs,           label: 'POI',           ...kpiColors[2] },
          { value: stats.totalParticipations, label: 'Partecipazioni',...kpiColors[3] },
        ]);
      }

      // Activities mini bar chart
      if (selected.has('activities') && stats && stats.activitiesByType.length > 0) {
        pdfSectionHeading(doc, 'Attività per tipo', C.accent2);
        pdfBarChart(doc, stats.activitiesByType, 6, (row, i) => TYPE_COLORS[i % TYPE_COLORS.length]);
      }

      // Crowding visual bar
      if (selected.has('poi_crowding') && stats && stats.poiCrowding.length > 0) {
        pdfSectionHeading(doc, 'Distribuzione affollamento POI', C.danger);
        pdfStackedBar(doc, stats.poiCrowding.map((r) => ({ stato: r.statoAffollamento, count: Number(r.count) })));
      }

      // Citizen needs mini chart
      if (selected.has('citizen_needs') && needs && needs.total > 0) {
        pdfSectionHeading(doc, `Segnalazioni cittadini — top categorie (tot. ${needs.total})`, C.accent3);
        pdfBarChart(doc, needs.byCategory.map((r) => ({ ...r, label: r.categoria })), 6, (r) => {
          if (r.categoria.includes('parcheggio')) return '#2563eb';
          if (r.categoria === 'sport') return '#16a34a';
          if (r.categoria === 'verde') return '#15803d';
          if (r.categoria === 'cultura') return '#9333ea';
          return C.accent3;
        });
      }

      // Supply/demand mini chart
      if (selected.has('supply_demand') && stats && stats.activitiesByType.length > 0) {
        pdfSectionHeading(doc, 'Rapporto domanda / offerta', C.accent2);
        const poiByType = stats.poiByType || [];
        const sdRows = stats.activitiesByType.map((r, i) => {
          const supply = matchPOICount(r.tipo, poiByType);
          const ratio = supply > 0 ? Number(r.count) / supply : Number(r.count);
          return { label: r.tipo, count: Math.round(ratio * 10) / 10, rawRatio: ratio };
        }).sort((a, b) => b.count - a.count);
        pdfBarChart(doc, sdRows, 6, (r) => r.rawRatio >= 4 ? C.danger : r.rawRatio >= 2 ? C.warning : C.success);
        doc.fontSize(8).fillColor(C.muted).text('Valore = rapporto attività/POI. >4× = alta pressione.').moveDown(0.5);
      }

      // ────────────────────── SECTION 2: DETAILED DATA ──────────────────
      doc.addPage();
      pdfDetailSectionBanner(doc, 'Dati Dettagliati');

      let sectionNum = 1;

      if (selected.has('kpi') && stats) {
        pdfSectionHeading(doc, `${sectionNum++}. KPI e Riepilogo`, C.primary);
        pdfTable(doc,
          ['Metrica', 'Valore'],
          [
            ['Attività totali', stats.totalActivities],
            ['Eventi certificati', stats.totalEvents],
            ['Punti di interesse', stats.totalPOIs],
            ['Partecipazioni totali', stats.totalParticipations],
            ...(stats.eventsByCategory || []).map((r) => [`  Eventi — ${r.categoria}`, r.count]),
          ],
          [380, 115],
        );
      }

      if (selected.has('activities') && stats) {
        pdfSectionHeading(doc, `${sectionNum++}. Attività — Tipo e Trend`, C.accent2);
        pdfTable(doc, ['Tipo', 'Attività'], stats.activitiesByType.map((r) => [r.tipo, r.count]), [380, 115]);
        if ((stats.activitiesByDay || []).length > 0) {
          doc.fontSize(9).fillColor(C.muted).text('Trend ultimi 14 giorni:').moveDown(0.2);
          pdfTable(doc, ['Data', 'Nuove attività'], stats.activitiesByDay.map((r) => [r.date, r.count]), [380, 115]);
        }
        if ((stats.activitiesByHour || []).length > 0) {
          doc.fontSize(9).fillColor(C.muted).text('Distribuzione oraria:').moveDown(0.2);
          pdfTable(doc, ['Ora', 'Attività avviate'],
            stats.activitiesByHour.filter((r) => Number(r.count) > 0).map((r) => [`${r.hour}:00`, r.count]),
            [380, 115]);
        }
      }

      if (selected.has('poi_crowding') && stats) {
        pdfSectionHeading(doc, `${sectionNum++}. Affollamento POI`, C.danger);
        pdfTable(doc, ['Stato', 'N° POI'], stats.poiCrowding.map((r) => [r.statoAffollamento, r.count]), [380, 115]);
        if ((stats.topCrowdedPOIs || []).length > 0) {
          doc.fontSize(9).fillColor(C.muted).text('Top POI più affollati:').moveDown(0.2);
          pdfTable(doc,
            ['Nome', 'Tipo', 'Stato', 'Capacità'],
            stats.topCrowdedPOIs.map((p) => [p.nome, p.tipo || '—', p.statoAffollamento, p.capacitaMax]),
            [190, 130, 90, 85]);
        }
      }

      if (selected.has('poi_inventory') && pois) {
        pdfSectionHeading(doc, `${sectionNum++}. Inventario Completo POI (${pois.length})`, C.accent3);
        pdfTable(doc,
          ['Nome', 'Tipo', 'Stato', 'Cap.'],
          pois.map((p) => [p.nome, p.tipo || '—', p.statoAffollamento, p.capacitaMax]),
          [205, 130, 90, 70]);
      }

      if (selected.has('supply_demand') && stats) {
        pdfSectionHeading(doc, `${sectionNum++}. Analisi Domanda / Offerta`, C.accent2);
        doc.fontSize(8).fillColor(C.muted).text('Abbinamento approssimativo tramite parole chiave POI.').moveDown(0.3);
        const poiByType = stats.poiByType || [];
        pdfTable(doc,
          ['Categoria', 'Domanda', 'Offerta POI', 'Rapporto', 'Segnale'],
          stats.activitiesByType.map((r) => {
            const supply = matchPOICount(r.tipo, poiByType);
            const ratio = supply > 0 ? Number(r.count) / supply : Number(r.count);
            return [r.tipo, r.count, supply, `${ratio.toFixed(1)}×`, ratio >= 4 ? '⚠ Alta pressione' : ratio >= 2 ? '↑ Moderata' : '✓ Bilanciata'];
          }).sort((a, b) => parseFloat(b[3]) - parseFloat(a[3])),
          [130, 65, 80, 70, 150]);
        if ((stats.poiByType || []).length > 0) {
          doc.fontSize(9).fillColor(C.muted).text('Inventario POI per tipo:').moveDown(0.2);
          pdfTable(doc, ['Tipo POI', 'Conteggio'], (stats.poiByType || []).map((r) => [r.tipo || '—', r.count]), [380, 115]);
        }
      }

      if (selected.has('citizen_needs') && needs) {
        pdfSectionHeading(doc, `${sectionNum++}. Segnalazioni Cittadini`, C.accent3);
        doc.fontSize(8).fillColor(C.muted).text(`Totale: ${needs.total} — dati anonimizzati, nessun dato personale.`).moveDown(0.3);
        pdfTable(doc, ['Categoria', 'Segnalazioni'], needs.byCategory.map((r) => [r.categoria, r.count]), [380, 115]);
        if ((needs.bySubcategory || []).length > 0) {
          doc.fontSize(9).fillColor(C.muted).text('Per sottocategoria:').moveDown(0.2);
          pdfTable(doc,
            ['Categoria', 'Sottocategoria', 'Segnalazioni'],
            needs.bySubcategory.map((r) => [r.categoria, r.sottocategoria, r.count]),
            [190, 190, 115]);
        }
      }

      // Footer on last page
      doc.fontSize(7).fillColor(C.muted)
        .text(`Trento Live Activity · Export ${dateStr} · Dati aggregati - scope ridotto, nessun dato personale`,
          M, 820, { width: PW, align: 'center' });

      doc.end();
      return;
    }

    res.status(400).json({ error: 'Unsupported format. Use ?format=csv or ?format=pdf', code: 'INVALID_FORMAT' });
  } catch (e) { next(e); }
}

module.exports = { getStats, getServiceRequestStats, exportStats };
