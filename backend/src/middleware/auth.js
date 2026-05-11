const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'UNAUTHORIZED' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
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

module.exports = { authenticate, authorize };
