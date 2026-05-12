const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./auth/auth.routes');
const activityRoutes = require('./activities/activity.routes');
const eventRoutes = require('./activities/event.routes');
const mapRoutes = require('./map/map.routes');
const moderationRoutes = require('./moderation/moderation.routes');
const dashboardRoutes = require('./dashboard/dashboard.routes');
const adminRoutes = require('./admin/admin.routes');
const notificationsRoutes = require('./notifications/notifications.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/activities', activityRoutes);
app.use('/events', eventRoutes);
app.use('/map', mapRoutes);
app.use('/moderation', moderationRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationsRoutes);
app.use(errorHandler);

module.exports = app;
