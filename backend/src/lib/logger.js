/**
 * Structured JSON logger — no external dependency, one line per event so the
 * output is grep-able locally and ingestable by log collectors (Render, Loki,
 * Datadog…) in production.
 *
 * Levels (most → least severe): error, warn, info, debug.
 * Threshold via LOG_LEVEL env (defaults: info in production, debug otherwise).
 *
 * Usage:
 *   logger.info('http_request', { method, path, status });
 *   logger.error('db_failure', { err: e.message });
 *   logger.audit('user.delete', { actorId, targetId });   // critical action trail
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configured = process.env.LOG_LEVEL && LEVELS[process.env.LOG_LEVEL] !== undefined
  ? LEVELS[process.env.LOG_LEVEL]
  : (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);

// Disable noisy output during automated tests unless explicitly asked.
const silent = process.env.NODE_ENV === 'test' && process.env.LOG_LEVEL === undefined;

function emit(level, event, meta) {
  if (silent || LEVELS[level] > configured) return;
  const entry = { ts: new Date().toISOString(), level, event, ...(meta || {}) };
  let line;
  try {
    line = JSON.stringify(entry);
  } catch {
    // Circular/unserializable meta — fall back to a safe summary.
    line = JSON.stringify({ ts: entry.ts, level, event, meta: '[unserializable]' });
  }
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  error: (event, meta) => emit('error', event, meta),
  warn: (event, meta) => emit('warn', event, meta),
  info: (event, meta) => emit('info', event, meta),
  debug: (event, meta) => emit('debug', event, meta),
  // Audit trail for sensitive actions (admin operations, auth, moderation).
  // Always emitted at info level and tagged so it can be filtered downstream.
  audit: (action, meta) => emit('info', 'audit', { action, audit: true, ...(meta || {}) }),
};
