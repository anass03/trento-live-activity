function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.error || err.message || 'Internal server error';

  if (status === 500) console.error(err);

  res.status(status).json({ error: message, code });
}

module.exports = errorHandler;
