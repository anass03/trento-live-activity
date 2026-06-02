const logger = require('../lib/logger');

// Health checks are polled constantly by the platform — don't flood the log.
const SKIP_PATHS = new Set(['/health', '/api/health']);

/**
 * Logs one structured line per completed HTTP request, including latency and the
 * authenticated user id when available (auth middleware runs after this, so the
 * id is read at finish time). Server errors (5xx) are logged at error level.
 */
function requestLogger(req, res, next) {
  if (SKIP_PATHS.has(req.path)) return next();

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const meta = {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs,
      userId: req.user?.id,
      role: req.user?.ruolo,
      ip: req.ip,
    };
    if (res.statusCode >= 500) logger.error('http_request', meta);
    else if (res.statusCode >= 400) logger.warn('http_request', meta);
    else logger.info('http_request', meta);
  });
  next();
}

module.exports = requestLogger;
