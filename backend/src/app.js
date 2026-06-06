const express = require('express');
const cors = require('cors');
const { globalLimiter } = require('./common/middleware/rateLimiter.middleware');
const globalErrorHandler = require('./common/errors/globalErrorHandler');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const timesheetRoutes = require('./modules/timesheet/timesheet.routes');
const editRequestRoutes = require('./modules/edit-requests/edit-requests.routes');
const usersRoutes = require('./modules/users/users.routes');
const clientsRoutes = require('./modules/clients/clients.routes');
const categoriesRoutes = require('./modules/categories/categories.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const notificationsRoutes = require('./modules/notifications/notification.routes');

const app = express();

// 1. CORS Configuration
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or postman requests with no origin
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      const errorMsg = `CORS blocked: Origin ${origin} is not allowed by configuration.`;
      return callback(new Error(errorMsg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// 2. Global Rate Limiter
app.use(globalLimiter);

// 3. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root landing endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Cybernara Timesheet Portal API Backend',
    version: '1.0.0',
    status: 'ONLINE',
    healthCheck: '/health'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 4. API Routes Mapping
app.use('/auth', authRoutes);
app.use('/entries', timesheetRoutes);
app.use('/edit-requests', editRequestRoutes);
app.use('/users', usersRoutes);
app.use('/clients', clientsRoutes);
app.use('/categories', categoriesRoutes);
app.use('/reports', reportsRoutes);
app.use('/notifications', notificationsRoutes);

// 5. Global Error Handler Middleware
app.use(globalErrorHandler);

module.exports = app;
