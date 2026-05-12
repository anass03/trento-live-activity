const jwt = require('jsonwebtoken');
const { isRevoked } = require('../auth/tokenBlacklist');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'UNAUTHORIZED' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (isRevoked(payload.jti)) {
      return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (!isRevoked(payload.jti)) req.user = payload;
  } catch { /* ignore — request remains anonymous */ }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
