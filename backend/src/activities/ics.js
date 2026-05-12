function pad(n) { return String(n).padStart(2, '0'); }

function formatIcsDate(dateStr, timeStr) {
  // dateStr "YYYY-MM-DD", timeStr "HH:MM" -> "YYYYMMDDTHHMMSS"
  const [y, mo, d] = dateStr.split('-');
  const [h, mi] = (timeStr || '00:00').split(':');
  return `${y}${mo}${d}T${pad(h)}${pad(mi)}00`;
}

function escape(text) {
  if (!text) return '';
  return String(text).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function buildIcs({ uid, summary, description, location, dateStr, startTime, endTime }) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trento Live Activity//IT',
    'BEGIN:VEVENT',
    `UID:${uid}@trento-live-activity`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsDate(dateStr, startTime)}`,
    `DTEND:${formatIcsDate(dateStr, endTime || startTime)}`,
    `SUMMARY:${escape(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escape(description)}`);
  if (location) lines.push(`LOCATION:${escape(location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = { buildIcs };
