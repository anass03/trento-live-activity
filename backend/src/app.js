const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./auth/auth.routes');
const activityRoutes = require('./activities/activity.routes');
const eventRoutes = require('./activities/event.routes');
const mapRoutes = require('./map/map.routes');
const userRoutes = require('./users/user.routes');
const moderationRoutes = require('./moderation/moderation.routes');
const dashboardRoutes = require('./dashboard/dashboard.routes');
const adminRoutes = require('./admin/admin.routes');
const notificationsRoutes = require('./notifications/notifications.routes');
const errorHandler = require('./middleware/errorHandler');

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

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/activities', activityRoutes);
app.use('/events', eventRoutes);
app.use('/map', mapRoutes);
app.use('/moderation', moderationRoutes);
app.use('/dashboard', dashboardRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/admin', adminRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use(errorHandler);

module.exports = app;
