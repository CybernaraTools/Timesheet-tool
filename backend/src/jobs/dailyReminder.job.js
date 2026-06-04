const prisma = require('../common/helpers/prisma');
const notificationService = require('../modules/notifications/notification.service');

async function runDailyReminder() {
  try {
    const today = new Date();
    // Set to local midnight for query mapping
    today.setHours(0, 0, 0, 0);

    // Fetch active employees
    const employees = await prisma.user.findMany({
      where: {
        role: 'employee',
        status: 'active'
      }
    });

    console.log(`[Daily Reminder Job]: Checking entries for ${employees.length} active employees...`);

    let reminderCount = 0;
    for (const emp of employees) {
      const entryCount = await prisma.timesheetEntry.count({
        where: {
          user_id: emp.id,
          work_date: today
        }
      });

      if (entryCount === 0) {
        await notificationService.send({
          userId: emp.id,
          title: 'Daily timesheet reminder',
          body: "You haven't logged any entries for today. Please fill in your timesheet before end of day.",
          sendEmail: true
        });
        reminderCount++;
      }
    }

    console.log(`[Daily Reminder Job]: Sent reminders to ${reminderCount} employees.`);
  } catch (err) {
    console.error('[Daily Reminder Job] Processor failed:', err.message);
  }
}

module.exports = runDailyReminder;
