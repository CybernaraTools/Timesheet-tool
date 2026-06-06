const prisma = require('../common/helpers/prisma');
const { sendMail } = require('../common/helpers/msGraph');

async function runWeeklyDigest() {
  try {
    console.log('[Weekly Digest Job]: Generating weekly digests for active managers...');

    const today = new Date();
    
    // Calculate last week's Monday and Friday
    // Monday of last week (7 days ago from Monday)
    const prevMonday = new Date(today);
    prevMonday.setDate(today.getDate() - 7);
    prevMonday.setHours(0, 0, 0, 0);

    // Friday of last week (3 days ago from Monday)
    const prevFriday = new Date(today);
    prevFriday.setDate(today.getDate() - 3);
    prevFriday.setHours(23, 59, 59, 999);

    const managers = await prisma.user.findMany({
      where: {
        role: 'manager',
        status: 'active'
      }
    });

    for (const mgr of managers) {
      // Find direct reports
      const reports = await prisma.user.findMany({
        where: {
          managers: { some: { manager_id: mgr.id } },
          status: 'active'
        },
        select: {
          id: true,
          full_name: true
        }
      });

      if (reports.length === 0) {
        console.log(`[Weekly Digest Job]: Manager ${mgr.full_name} has no active team members. Skipping digest.`);
        continue;
      }

      const reportIds = reports.map((r) => r.id);

      // Fetch all entries for reportIds during last week's work days
      const entries = await prisma.timesheetEntry.findMany({
        where: {
          user_id: { in: reportIds },
          work_date: {
            gte: prevMonday,
            lte: prevFriday
          }
        }
      });

      // Build stats
      const userStats = {};
      reports.forEach((r) => {
        userStats[r.id] = {
          name: r.full_name,
          totalMinutes: 0,
          entriesCount: 0
        };
      });

      entries.forEach((e) => {
        if (userStats[e.user_id]) {
          userStats[e.user_id].totalMinutes += e.duration_minutes || 0;
          userStats[e.user_id].entriesCount += 1;
        }
      });

      // Format clean report
      const fromStr = prevMonday.toISOString().split('T')[0];
      const toStr = prevFriday.toISOString().split('T')[0];
      
      let emailBody = `Here is the timesheet digest for your team for the previous week (${fromStr} to ${toStr}):\n\n`;
      emailBody += '----------------------------------------------------------\n';
      emailBody += 'Employee Name       | Total Hours Logged | Tasks Logged\n';
      emailBody += '----------------------------------------------------------\n';

      Object.values(userStats).forEach((stat) => {
        const hrs = (stat.totalMinutes / 60).toFixed(1);
        const namePad = stat.name.padEnd(20, ' ').substring(0, 20);
        const hrsPad = `${hrs} hrs`.padEnd(19, ' ');
        emailBody += `${namePad}| ${hrsPad}| ${stat.entriesCount} tasks\n`;
      });
      emailBody += '----------------------------------------------------------\n\n';
      emailBody += 'Thank you,\nTimesheet Portal Admin';

      // Send Outlook Email
      await sendMail(
        mgr.email,
        'Weekly Team Timesheet Digest',
        emailBody
      );
    }

    console.log('[Weekly Digest Job]: Finished generating all manager digests.');
  } catch (err) {
    console.error('[Weekly Digest Job] Processor failed:', err.message);
  }
}

module.exports = runWeeklyDigest;
