require('dotenv').config();
const app = require('./app');
const { initScheduler } = require('./jobs/queue');
const prisma = require('./common/helpers/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Test database connection
    console.log('[Server]: Connecting to Supabase PostgreSQL database via Prisma...');
    await prisma.$connect();
    console.log('[Server]: Database connection successfully established.');

    // 2. Initialize job queues and repeat schedules
    initScheduler();

    // 3. Start Express server listener
    app.listen(PORT, () => {
      console.log(`[Server]: Express backend running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize server:', err.message);
    process.exit(1);
  }
}

// Global process exception safety nets
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

startServer();
