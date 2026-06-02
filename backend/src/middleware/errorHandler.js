const logger = require('../lib/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Never leak internal error details to the client. Log them server-side instead.
  // Exception: 503 Service Unavailable is safe to pass through (e.g. "AI not configured").
  if (status >= 500) {
    logger.error('unhandled_error', {
      code,
      status,
      message: err.message,
      path: req?.originalUrl,
      method: req?.method,
      userId: req?.user?.id,
      stack: err.stack,
    });
    if (status !== 503) {
      return res.status(status).json({ error: 'Internal server error', code });
    }
  }

  const message = err.error || err.message || 'Bad request';
  res.status(status).json({ error: message, code });
}

module.exports = errorHandler;
