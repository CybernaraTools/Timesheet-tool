const PDFDocument = require('pdfkit');
const prisma = require('../../common/helpers/prisma');
const supabase = require('../../common/helpers/supabase');
const AppError = require('../../common/errors/AppError');

// Helper to format time strings from DB
function formatTimeToStr(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.substring(0, 5);
  }
  const hours = dateVal.getHours().toString().padStart(2, '0');
  const minutes = dateVal.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Generate CSV string from entries
function buildCSV(entries) {
  const headers = [
    'Employee',
    'Date',
    'Client',
    'Category',
    'Task Title',
    'Description',
    'Start Time',
    'End Time',
    'Duration (Hours)',
    'Output Status',
    'Comment'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const rows = entries.map((e) => [
    e.user.full_name,
    e.work_date.toISOString().split('T')[0],
    e.client ? e.client.name : 'Internal / None',
    e.category.name,
    e.task_title,
    e.description || '',
    formatTimeToStr(e.start_time),
    formatTimeToStr(e.end_time),
    (e.duration_minutes / 60).toFixed(2),
    e.output_status,
    e.comment || ''
  ]);

  return [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
}

// Helper to upload file buffer to Supabase Storage and get a 1-hour signed URL
async function uploadAndGetSignedUrl(fileName, buffer, contentType) {
  const bucketName = 'reports';

  // Ensure bucket exists by checking/creating it
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  const reportsBucketExists = buckets.some((b) => b.name === bucketName);
  if (!reportsBucketExists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false
    });
    if (createError) {
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }
  }

  // Upload file
  const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, buffer, {
    contentType,
    upsert: true
  });

  if (uploadError) {
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  // Generate 1-hour signed URL (3600 seconds)
  const { data: urlData, error: urlError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fileName, 3600);

  if (urlError) {
    throw new Error(`Failed to create signed URL: ${urlError.message}`);
  }

  return urlData.signedUrl;
}

const reportsController = {
  // POST /reports/export/csv
  exportCsv: async (req, res, next) => {
    try {
      const { from, to, user_ids, category_ids, client_ids } = req.body;
      const where = {};

      // 1. Date filter is required
      if (!from || !to) {
        throw new AppError('VALIDATION_ERROR', 'Date range (from and to) is required.', 400);
      }
      where.work_date = {
        gte: new Date(from),
        lte: new Date(to)
      };

      // 2. Team-scoping rules
      if (req.user.role === 'employee') {
        throw new AppError('FORBIDDEN', 'Employees are not permitted to export reports.', 403);
      } else if (req.user.role === 'manager') {
        const reports = await prisma.user.findMany({
          where: { manager_id: req.user.id },
          select: { id: true }
        });
        const directReportIds = reports.map((r) => r.id);
        const allowedIds = [req.user.id, ...directReportIds];

        const scopeConditions = [
          { user_id: { in: allowedIds } },
          { entry_managers: { some: { manager_id: req.user.id } } }
        ];

        if (user_ids && Array.isArray(user_ids)) {
          const directRequestedIds = user_ids.filter(uid => allowedIds.includes(uid));
          const otherRequestedIds = user_ids.filter(uid => !allowedIds.includes(uid));

          const userScopeConditions = [];
          if (directRequestedIds.length > 0) {
            userScopeConditions.push({ user_id: { in: directRequestedIds } });
          }
          if (otherRequestedIds.length > 0) {
            userScopeConditions.push({
              user_id: { in: otherRequestedIds },
              entry_managers: { some: { manager_id: req.user.id } }
            });
          }

          if (userScopeConditions.length > 0) {
            where.OR = userScopeConditions;
          } else {
            where.id = '00000000-0000-0000-0000-000000000000'; // empty match
          }
        } else {
          where.OR = scopeConditions;
        }
      } else if (req.user.role === 'admin') {
        if (user_ids && Array.isArray(user_ids)) {
          where.user_id = { in: user_ids };
        }
      }

      // 3. Other filters
      if (category_ids && Array.isArray(category_ids)) {
        where.category_id = { in: category_ids };
      }
      if (client_ids && Array.isArray(client_ids)) {
        where.client_id = { in: client_ids };
      }

      // 4. Fetch entries
      const entries = await prisma.timesheetEntry.findMany({
        where,
        include: {
          client: { select: { name: true } },
          category: { select: { name: true } },
          user: { select: { full_name: true } }
        },
        orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }]
      });

      const csvContent = buildCSV(entries);
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      const fileName = `timesheet-export-${Date.now()}.csv`;

      const signedUrl = await uploadAndGetSignedUrl(fileName, csvBuffer, 'text/csv');

      return res.status(200).json({ url: signedUrl });
    } catch (err) {
      next(err);
    }
  },

  // POST /reports/export/pdf
  exportPdf: async (req, res, next) => {
    try {
      const { from, to, user_ids, category_ids, client_ids } = req.body;
      const where = {};

      if (!from || !to) {
        throw new AppError('VALIDATION_ERROR', 'Date range (from and to) is required.', 400);
      }
      where.work_date = {
        gte: new Date(from),
        lte: new Date(to)
      };

      if (req.user.role === 'employee') {
        throw new AppError('FORBIDDEN', 'Employees are not permitted to export reports.', 403);
      } else if (req.user.role === 'manager') {
        const reports = await prisma.user.findMany({
          where: { manager_id: req.user.id },
          select: { id: true }
        });
        const directReportIds = reports.map((r) => r.id);
        const allowedIds = [req.user.id, ...directReportIds];

        const scopeConditions = [
          { user_id: { in: allowedIds } },
          { entry_managers: { some: { manager_id: req.user.id } } }
        ];

        if (user_ids && Array.isArray(user_ids)) {
          const directRequestedIds = user_ids.filter(uid => allowedIds.includes(uid));
          const otherRequestedIds = user_ids.filter(uid => !allowedIds.includes(uid));

          const userScopeConditions = [];
          if (directRequestedIds.length > 0) {
            userScopeConditions.push({ user_id: { in: directRequestedIds } });
          }
          if (otherRequestedIds.length > 0) {
            userScopeConditions.push({
              user_id: { in: otherRequestedIds },
              entry_managers: { some: { manager_id: req.user.id } }
            });
          }

          if (userScopeConditions.length > 0) {
            where.OR = userScopeConditions;
          } else {
            where.id = '00000000-0000-0000-0000-000000000000'; // empty match
          }
        } else {
          where.OR = scopeConditions;
        }
      } else if (req.user.role === 'admin') {
        if (user_ids && Array.isArray(user_ids)) {
          where.user_id = { in: user_ids };
        }
      }

      if (category_ids && Array.isArray(category_ids)) {
        where.category_id = { in: category_ids };
      }
      if (client_ids && Array.isArray(client_ids)) {
        where.client_id = { in: client_ids };
      }

      const entries = await prisma.timesheetEntry.findMany({
        where,
        include: {
          client: { select: { name: true } },
          category: { select: { name: true } },
          user: { select: { full_name: true } }
        },
        orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }]
      });

      // Generate PDF in a Promise buffer
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // PDF Styling
        doc.fillColor('#0f172a').fontSize(20).text('Cybernara - Timesheet Summary Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#64748b').text(`Period: ${from} to ${to}`, { align: 'center' });
        doc.moveDown(1.5);

        // Header line
        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);

        // Summary Statistics
        const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
        const totalHours = (totalMinutes / 60).toFixed(2);
        
        doc.fontSize(12).fillColor('#0f172a').text(`Total Hours Logged: ${totalHours} hrs`, { bold: true });
        doc.text(`Total Tasks: ${entries.length}`);
        doc.moveDown(1.5);

        // Task Table Headers
        let y = doc.y;
        doc.fontSize(10).fillColor('#1e293b');
        doc.text('Date', 50, y, { width: 70, bold: true });
        doc.text('Employee', 120, y, { width: 100, bold: true });
        doc.text('Client/Category', 220, y, { width: 120, bold: true });
        doc.text('Task Title', 340, y, { width: 170, bold: true });
        doc.text('Hours', 510, y, { width: 50, bold: true, align: 'right' });
        doc.moveDown(0.5);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);

        // Task Rows
        entries.forEach((e) => {
          // If close to page bottom, add a page
          if (doc.y > 700) {
            doc.addPage();
            y = 50;
            // Redraw headers on new page
            doc.fontSize(10).fillColor('#1e293b');
            doc.text('Date', 50, y, { width: 70 });
            doc.text('Employee', 120, y, { width: 100 });
            doc.text('Client/Category', 220, y, { width: 120 });
            doc.text('Task Title', 340, y, { width: 170 });
            doc.text('Hours', 510, y, { width: 50, align: 'right' });
            doc.moveDown(0.5);
            doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
            doc.moveDown(0.5);
          }

          const currentY = doc.y;
          doc.fontSize(9).fillColor('#334155');
          
          const dateStr = e.work_date.toISOString().split('T')[0];
          doc.text(dateStr, 50, currentY, { width: 70 });
          doc.text(e.user.full_name, 120, currentY, { width: 100 });
          
          const clientCat = `${e.client ? e.client.name : 'Internal'} / ${e.category.name}`;
          doc.text(clientCat, 220, currentY, { width: 120 });
          doc.text(e.task_title, 340, currentY, { width: 170 });
          
          const hrs = (e.duration_minutes / 60).toFixed(2);
          doc.text(hrs, 510, currentY, { width: 50, align: 'right' });
          
          doc.moveDown(0.8);
        });

        doc.end();
      });

      const fileName = `timesheet-export-${Date.now()}.pdf`;
      const signedUrl = await uploadAndGetSignedUrl(fileName, pdfBuffer, 'application/pdf');

      return res.status(200).json({ url: signedUrl });
    } catch (err) {
      next(err);
    }
  },

  // GET /reports/team-summary
  teamSummary: async (req, res, next) => {
    try {
      let managerId = req.user.id;

      if (req.user.role === 'admin') {
        const queryManagerId = req.query.manager_id;
        if (queryManagerId) {
          managerId = queryManagerId;
        } else {
          // If admin does not provide a manager_id, they see system-wide summary
          managerId = null;
        }
      }

      // Determine the user scope
      let teamUserIds = [];
      if (managerId) {
        // Manager's team includes direct reports + manager themselves
        const reports = await prisma.user.findMany({
          where: { manager_id: managerId },
          select: { id: true }
        });
        teamUserIds = [managerId, ...reports.map((r) => r.id)];
      } else {
        // Admin system-wide: fetch all active user IDs
        const allUsers = await prisma.user.findMany({
          where: { status: 'active' },
          select: { id: true }
        });
        teamUserIds = allUsers.map((u) => u.id);
      }

      // Date calculations
      const today = new Date();
      
      // Calculate start of current week (Monday)
      const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + distanceToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Fetch entries for this week with updated manager scoping
      const whereCondition = {
        work_date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      };

      if (managerId) {
        whereCondition.OR = [
          { user_id: { in: teamUserIds } },
          { entry_managers: { some: { manager_id: managerId } } }
        ];
      } else {
        whereCondition.user_id = { in: teamUserIds };
      }

      const weeklyEntries = await prisma.timesheetEntry.findMany({
        where: whereCondition,
        include: {
          category: { select: { name: true } },
          client: { select: { name: true } }
        }
      });

      // Calculate total hours this week
      const totalMinutes = weeklyEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
      const totalHoursThisWeek = (totalMinutes / 60).toFixed(1);

      // Active members this week
      const activeMembersSet = new Set(weeklyEntries.map((e) => e.user_id));
      const activeMembers = activeMembersSet.size;

      // Group and find top category
      const categoryMinutes = {};
      const clientMinutes = {};

      weeklyEntries.forEach((e) => {
        const catName = e.category.name;
        categoryMinutes[catName] = (categoryMinutes[catName] || 0) + (e.duration_minutes || 0);

        if (e.client) {
          const cliName = e.client.name;
          clientMinutes[cliName] = (clientMinutes[cliName] || 0) + (e.duration_minutes || 0);
        }
      });

      let topCategory = 'N/A';
      let maxCatMin = 0;
      Object.entries(categoryMinutes).forEach(([name, min]) => {
        if (min > maxCatMin) {
          maxCatMin = min;
          topCategory = name;
        }
      });

      let topClient = 'Internal';
      let maxCliMin = 0;
      Object.entries(clientMinutes).forEach(([name, min]) => {
        if (min > maxCliMin) {
          maxCliMin = min;
          topClient = name;
        }
      });

      // Calculate hours by day for the last 7 days
      const hoursByDay = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Filter entries for this date
        const dayMinutes = weeklyEntries
          .filter((e) => e.work_date.toISOString().split('T')[0] === dateStr)
          .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

        hoursByDay.push({
          date: dateStr,
          hours: Number((dayMinutes / 60).toFixed(1))
        });
      }

      return res.status(200).json({
        totalHoursThisWeek: Number(totalHoursThisWeek),
        activeMembers,
        topCategory,
        topClient,
        hoursByDay
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reportsController;
