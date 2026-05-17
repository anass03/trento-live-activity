const jwt = require('jsonwebtoken');
const { isRevoked } = require('../auth/tokenBlacklist');

// Routes that a token marked as needs2faSetup may still reach.
const SETUP_ALLOWED_PATHS = new Set([
  '/api/auth/2fa/setup',
  '/api/auth/2fa/verify',
  '/api/auth/logout',
  '/api/auth/me',
]);

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'UNAUTHORIZED' });
  }
  let payload;
  try {
    payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }
  // isRevoked è ora async (lookup su DB con cache). Va awaited.
  if (await isRevoked(payload.jti)) {
    return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
  }
  if (payload.needs2faSetup && !SETUP_ALLOWED_PATHS.has(req.originalUrl.split('?')[0])) {
    return res.status(403).json({ error: '2FA setup required before accessing this resource', code: '2FA_SETUP_REQUIRED' });
  }
  req.user = payload;
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (!(await isRevoked(payload.jti))) req.user = payload;
  } catch { /* ignore — request remains anonymous */ }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
