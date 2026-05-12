function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Never leak internal error details to the client. Log them server-side instead.
  if (status >= 500) {
    console.error('[errorHandler]', err);
    return res.status(status).json({ error: 'Internal server error', code });
  }

  const message = err.error || err.message || 'Bad request';
  res.status(status).json({ error: message, code });
}

module.exports = errorHandler;
