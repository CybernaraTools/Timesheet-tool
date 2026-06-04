const prisma = require('../common/helpers/prisma');
const notificationService = require('../modules/notifications/notification.service');

// Utility to get the Date objects of the last 2 business days (skipping Saturday and Sunday)
function getLastTwoWorkingDays(refDate = new Date()) {
  const dates = [];
  const d = new Date(refDate);

  // Traverse backward in calendar days until we collect 2 working days
  while (dates.length < 2) {
    d.setDate(d.getDate() - 1);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

async function runMissingEntry() {
  try {
    const prevWorkingDays = getLastTwoWorkingDays();
    // Zero out hours/minutes for date matching
    prevWorkingDays.forEach((d) => d.setHours(0, 0, 0, 0));

    const formattedDates = prevWorkingDays.map((d) => d.toISOString().split('T')[0]);
    console.log(`[Missing Entry Job]: Checking entries for dates: ${formattedDates.join(', ')}...`);

    const employees = await prisma.user.findMany({
      where: {
        role: 'employee',
        status: 'active'
      }
    });

    let alertCount = 0;
    for (const emp of employees) {
      const missingDates = [];

      for (const d of prevWorkingDays) {
        const count = await prisma.timesheetEntry.count({
          where: {
            user_id: emp.id,
            work_date: d
          }
        });

        if (count === 0) {
          missingDates.push(d.toISOString().split('T')[0]);
        }
      }

      if (missingDates.length > 0) {
        const datesStr = missingDates.join(', ');
        await notificationService.send({
          userId: emp.id,
          title: 'Missing timesheet entries',
          body: `You have missing timesheet entries for the following dates: ${datesStr}. Please log your work as soon as possible.`,
          sendEmail: true
        });
        alertCount++;
      }
    }

    console.log(`[Missing Entry Job]: Dispatched missing entry alerts to ${alertCount} employees.`);
  } catch (err) {
    console.error('[Missing Entry Job] Processor failed:', err.message);
  }
}

module.exports = runMissingEntry;
