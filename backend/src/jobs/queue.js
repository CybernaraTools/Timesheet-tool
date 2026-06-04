const Queue = require('bull');
const path = require('path');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const timezone = process.env.JOB_TIMEZONE || 'Asia/Kolkata';

// Define queues
const dailyReminderQueue = new Queue('daily-reminder', redisUrl);
const weeklyDigestQueue = new Queue('weekly-digest', redisUrl);
const missingEntryQueue = new Queue('missing-entry', redisUrl);

// Import job logic
const runDailyReminder = require('./dailyReminder.job');
const runWeeklyDigest = require('./weeklyDigest.job');
const runMissingEntry = require('./missingEntry.job');

function initScheduler() {
  console.log('[Scheduler]: Initializing background job repeat queues...');

  // Setup process handlers
  dailyReminderQueue.process(async (job) => {
    console.log('[Scheduler]: Running Daily Reminder Job...');
    await runDailyReminder();
  });

  weeklyDigestQueue.process(async (job) => {
    console.log('[Scheduler]: Running Weekly Digest Job...');
    await runWeeklyDigest();
  });

  missingEntryQueue.process(async (job) => {
    console.log('[Scheduler]: Running Missing Entry Job...');
    await runMissingEntry();
  });

  // Schedule repeatable cron tasks
  // Clean old schedules first to prevent duplicate trigger registrations
  Promise.all([
    dailyReminderQueue.clean(0, 'delayed'),
    weeklyDigestQueue.clean(0, 'delayed'),
    missingEntryQueue.clean(0, 'delayed')
  ]).then(async () => {
    // Add cron tasks
    // Mon-Fri at 17:00
    await dailyReminderQueue.add({}, {
      repeat: { cron: '0 17 * * 1-5', tz: timezone },
      jobId: 'daily-reminder-cron'
    });

    // Every Monday at 08:00
    await weeklyDigestQueue.add({}, {
      repeat: { cron: '0 8 * * 1', tz: timezone },
      jobId: 'weekly-digest-cron'
    });

    // Every day at 09:00
    await missingEntryQueue.add({}, {
      repeat: { cron: '0 9 * * *', tz: timezone },
      jobId: 'missing-entry-cron'
    });

    console.log('[Scheduler]: Repeating background jobs configured successfully.');
  }).catch(err => {
    console.error('[Scheduler] Error setting up job queues:', err.message);
  });
}

module.exports = {
  initScheduler,
  dailyReminderQueue,
  weeklyDigestQueue,
  missingEntryQueue
};
