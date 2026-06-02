const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./auth/auth.routes');
const activityRoutes = require('./activities/activity.routes');
const eventRoutes = require('./activities/event.routes');
const mapRoutes = require('./map/map.routes');
const favoritesRoutes = require('./users/favorites.routes');
const moderationRoutes = require('./moderation/moderation.routes');
const dashboardRoutes = require('./dashboard/dashboard.routes');
const adminRoutes = require('./admin/admin.routes');
const notificationsRoutes = require('./notifications/notifications.routes');
const aiRoutes = require('./ai/ai.routes');
const parkingRoutes = require('./parking/parking.routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

const configuredOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((origin) => origin.trim()));
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error('Not allowed by CORS');
    error.status = 403;
    error.code = 'CORS_FORBIDDEN';
    callback(error);
  },
  credentials: true,
}));
app.use(express.json());

// Structured access log (one JSON line per request, with latency + user id).
app.use(requestLogger);

// Rate limit globale (RNF / API Gateway): protegge da brute force, DoS, scraping
// e abuso di endpoint costosi (es. AI suggester che consuma quota Gemini).
// In dev il limite è più alto perché React StrictMode + Vite HMR + DevTools
// generano molte più richieste rispetto a un utente reale.
const isProd = process.env.NODE_ENV === 'production';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 200 : 2000,
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// #H5: tutte le route SOLO sotto /api/*. I mount legacy senza prefisso erano
// raggiungibili bypassando un eventuale reverse proxy che filtra solo /api/*.
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users/me/favorites', favoritesRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/parking', parkingRoutes);
app.use(errorHandler);

module.exports = app;
