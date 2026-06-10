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
const weatherRoutes = require('./weather/weather.routes');
const cityAlertsRoutes = require('./city-alerts/cityAlerts.routes');
const serviceRequestRoutes = require('./service-requests/service-request.routes');
const socialEventsRoutes = require('./social/socialEvents.routes');
const socialActivitiesRoutes = require('./social/socialActivities.routes');
const commentsRoutes = require('./social/comments.routes');
const { usersRouter: socialUsersRoutes, meRouter: socialMeRoutes } = require('./social/socialUser.routes');
const settingsRoutes = require('./social/settings.routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Dietro il proxy di Railway (reverse proxy) Express deve fidarsi dell'header
// X-Forwarded-For per leggere l'IP reale del client; senza, express-rate-limit
// lancia ERR_ERL_UNEXPECTED_X_FORWARDED_FOR e il rate limiting non funziona.
// '1' = un singolo proxy davanti all'app (l'edge di Railway).
app.set('trust proxy', 1);

const configuredOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((origin) => origin.trim()));
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
]);

// In sviluppo Vite può ripiegare su una porta diversa da 5173 se occupata:
// qualsiasi origin localhost/127.0.0.1 è considerato fidato fuori produzione.
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has('*') || allowedOrigins.has(origin)
      || (process.env.NODE_ENV !== 'production' && isLocalOrigin(origin))) {
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
app.use('/api/activities', socialActivitiesRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', socialEventsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', socialUsersRoutes);
app.use('/api/users/me', socialMeRoutes);
app.use('/api/users/me/favorites', favoritesRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/city-alerts', cityAlertsRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/me/settings', settingsRoutes);
app.use('/api/me', socialMeRoutes);
app.use(errorHandler);

module.exports = app;

