const ExcelJS    = require('exceljs');
const PDFDocument = require('pdfkit');
const prisma      = require('../../common/helpers/prisma');
const supabase    = require('../../common/helpers/supabase');
const AppError    = require('../../common/errors/AppError');

// Format a DB time value to 12-hour "hh:mm:ss AM/PM"
function formatTime12h(dateVal) {
  if (!dateVal) return '';
  let hours, minutes, seconds;
  if (typeof dateVal === 'string') {
    const parts = dateVal.split(':');
    hours   = parseInt(parts[0], 10);
    minutes = parseInt(parts[1] || '0', 10);
    seconds = parseInt(parts[2] || '0', 10);
  } else {
    hours   = dateVal.getUTCHours();
    minutes = dateVal.getUTCMinutes();
    seconds = dateVal.getUTCSeconds();
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12    = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${period}`;
}

// Format minutes → "X hr Y min" / "X hr" / "Y min"
function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '';
  const hrs  = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${mins} min`;
}

// Format a Date to "29/May/2026"
function formatDateLabel(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const year  = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Day name from a Date
function getDayName(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

// Shared cell style helpers
const COLS = 10; // total columns A–J

function applyFill(row, color) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  });
}

function applyFont(row, opts = {}) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 11, ...opts };
  });
}

function applyAlignment(row, horizontal = 'left') {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.alignment = { horizontal, vertical: 'middle', wrapText: false };
  });
}

function applyBorder(row, color = 'FFD0D0D0') {
  const side = { style: 'thin', color: { argb: color } };
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { top: side, bottom: side, left: side, right: side };
  });
}

// Build a styled XLSX workbook and return a Buffer
async function buildXLSX(entries) {
  const workbook  = new ExcelJS.Workbook();
  const sheet     = workbook.addWorksheet('Timesheet');

  // ── Column widths (fixes ########) ─────────────────────────────────────────
  sheet.columns = [
    { key: 'A', width: 10  }, // Sr No
    { key: 'B', width: 18  }, // Client
    { key: 'C', width: 26  }, // Task
    { key: 'D', width: 20  }, // Category
    { key: 'E', width: 38  }, // Ticket/Ref/Description
    { key: 'F', width: 16  }, // Start Time
    { key: 'G', width: 16  }, // End Time
    { key: 'H', width: 14  }, // Duration
    { key: 'I', width: 14  }, // Output/Status
    { key: 'J', width: 24  }, // Comment
  ];

  // ── 1. Collect unique employees ────────────────────────────────────────────
  const employeeMap = new Map();
  entries.forEach((e) => {
    if (!employeeMap.has(e.user_id)) {
      const managerEmails = (e.user.managers || [])
        .map((m) => m.manager?.email)
        .filter(Boolean)
        .join(', ');
      employeeMap.set(e.user_id, {
        name: e.user.full_name,
        email: e.user.email || '',
        managerEmails
      });
    }
  });

  // ── 2. Employee info header block ──────────────────────────────────────────
  // Dark navy background (#1B2A4A), white bold text
  employeeMap.forEach((info) => {
    // Row: "Employee:  Name" | email
    const empRow = sheet.addRow(['Employee:  ' + info.name, info.email, '', '', '', '', '', '', '', '']);
    empRow.height = 22;
    applyFill(empRow, 'FF1B2A4A');
    applyFont(empRow, { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 });
    applyAlignment(empRow);
    // Make "Employee: Name" span cols A-E visually (merge)
    sheet.mergeCells(`A${empRow.number}:E${empRow.number}`);

    if (info.managerEmails) {
      const mgrRow = sheet.addRow(['Submitted To:  ' + info.managerEmails, '', '', '', '', '', '', '', '', '']);
      mgrRow.height = 20;
      applyFill(mgrRow, 'FF243352');
      applyFont(mgrRow, { color: { argb: 'FFBBCCE4' }, size: 10 });
      applyAlignment(mgrRow);
      sheet.mergeCells(`A${mgrRow.number}:J${mgrRow.number}`);
    }
  });

  // Blank separator
  const blankRow = sheet.addRow(['', '', '', '', '', '', '', '', '', '']);
  blankRow.height = 8;

  // ── 3. Group entries by date ───────────────────────────────────────────────
  const groups    = {};
  const dateOrder = [];
  entries.forEach((e) => {
    const iso = e.work_date instanceof Date
      ? e.work_date.toISOString().split('T')[0]
      : String(e.work_date).split('T')[0];
    if (!groups[iso]) { groups[iso] = []; dateOrder.push(iso); }
    groups[iso].push(e);
  });

  // ── 4. Emit one section per date ───────────────────────────────────────────
  const colHeaders = ['Sr No', 'Client', 'Task', 'Category', 'Ticket/Ref/Description', 'Start Time', 'End Time', 'Duration', 'Output/Status', 'Comment'];

  dateOrder.forEach((iso) => {
    const dayEntries = groups[iso];

    // Date + Day header row — cobalt blue (#1C4587) white bold
    const dateLabel = formatDateLabel(iso);
    const dayLabel  = getDayName(iso);
    const dateValues = [`Date: ${dateLabel}`, '', '', '', '', `Day: ${dayLabel}`, '', '', '', ''];
    const dateRow = sheet.addRow(dateValues);
    dateRow.height = 22;
    applyFill(dateRow, 'FF1C4587');
    applyFont(dateRow, { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 });
    applyAlignment(dateRow);
    // Merge A:E for the date label, F:J for the day label
    sheet.mergeCells(`A${dateRow.number}:E${dateRow.number}`);
    sheet.mergeCells(`F${dateRow.number}:J${dateRow.number}`);

    // Column headers row — dark charcoal (#2D2D2D) white bold
    const hdrRow = sheet.addRow(colHeaders);
    hdrRow.height = 20;
    applyFill(hdrRow, 'FF2D2D2D');
    applyFont(hdrRow, { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 });
    applyAlignment(hdrRow, 'center');
    applyBorder(hdrRow, 'FF444444');

    // Data rows — alternating white / very light grey
    dayEntries.forEach((e, idx) => {
      const isEven = idx % 2 === 0;
      const rowData = [
        idx + 1,
        e.client ? e.client.name : '',
        e.task_title,
        e.category.name,
        e.description || '',
        formatTime12h(e.start_time),  // stored as plain text string → no ########
        formatTime12h(e.end_time),
        formatDuration(e.duration_minutes),
        e.output_status
          ? e.output_status.charAt(0).toUpperCase() + e.output_status.slice(1).replace(/_/g, ' ')
          : '',
        e.comment || ''
      ];
      const dataRow = sheet.addRow(rowData);
      dataRow.height = 18;
      applyFill(dataRow, isEven ? 'FFFAFAFA' : 'FFF0F4FA');
      applyFont(dataRow, { color: { argb: 'FF1A1A1A' }, size: 10 });
      applyBorder(dataRow, 'FFE0E0E0');

      // Force time cells (F & G) to text so Excel never misinterprets as time values
      ['F', 'G'].forEach((col) => {
        const cell = dataRow.getCell(col);
        cell.numFmt = '@';  // @ = text format
        cell.value  = String(cell.value || '');
      });

      // Right-align Sr No
      dataRow.getCell('A').alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Small gap between date sections
    const gapRow = sheet.addRow(['', '', '', '', '', '', '', '', '', '']);
    gapRow.height = 6;
  });

  return workbook.xlsx.writeBuffer();
}

// Helper to upload file buffer to Supabase Storage and get a 1-hour signed URL
async function uploadAndGetSignedUrl(fileName, buffer, contentType) {
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
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
          where: { managers: { some: { manager_id: req.user.id } } },
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

      // 4. Fetch entries (include user email + their managers' emails)
      const entries = await prisma.timesheetEntry.findMany({
        where,
        include: {
          client:   { select: { name: true } },
          category: { select: { name: true } },
          user: {
            select: {
              full_name: true,
              email:     true,
              managers: {
                select: {
                  manager: { select: { email: true } }
                }
              }
            }
          }
        },
        orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }]
      });

      const xlsxBuffer = await buildXLSX(entries);
      const fileName    = `timesheet-export-${Date.now()}.xlsx`;

      const signedUrl = await uploadAndGetSignedUrl(
        fileName,
        xlsxBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

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
          where: { managers: { some: { manager_id: req.user.id } } },
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
        const totalHoursFormatted = formatDuration(totalMinutes);
        
        doc.fontSize(12).fillColor('#0f172a').text(`Total Duration Logged: ${totalHoursFormatted}`, { bold: true });
        doc.text(`Total Tasks: ${entries.length}`);
        doc.moveDown(1.5);

        // Task Table Headers
        let y = doc.y;
        doc.fontSize(10).fillColor('#1e293b');
        doc.text('Date', 50, y, { width: 70, bold: true });
        doc.text('Employee', 120, y, { width: 100, bold: true });
        doc.text('Client/Category', 220, y, { width: 120, bold: true });
        doc.text('Task Title', 340, y, { width: 150, bold: true });
        doc.text('Duration', 490, y, { width: 72, bold: true, align: 'right' });
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
            doc.text('Task Title', 340, y, { width: 150 });
            doc.text('Duration', 490, y, { width: 72, align: 'right' });
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
          doc.text(e.task_title, 340, currentY, { width: 150 });
          
          const durStr = formatDuration(e.duration_minutes);
          doc.text(durStr, 490, currentY, { width: 72, align: 'right' });
          
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
        // Manager's team includes direct reports + manager themselves (excluding admins)
        const reports = await prisma.user.findMany({
          where: {
            managers: { some: { manager_id: managerId } },
            role: { not: 'admin' }
          },
          select: { id: true }
        });
        const managerSelf = await prisma.user.findUnique({
          where: { id: managerId },
          select: { role: true }
        });
        teamUserIds = reports.map((r) => r.id);
        if (managerSelf && managerSelf.role !== 'admin') {
          teamUserIds.push(managerId);
        }
      } else {
        // Admin system-wide: fetch all active user IDs (except administrators)
        const allUsers = await prisma.user.findMany({
          where: {
            status: 'active',
            role: { not: 'admin' }
          },
          select: { id: true }
        });
        teamUserIds = allUsers.map((u) => u.id);
      }

      // Validate target user if user_id is provided
      const targetUserId = req.query.user_id;
      if (targetUserId) {
        if (req.user.role === 'admin') {
          const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { role: true }
          });
          if (!targetUser || targetUser.role === 'admin') {
            throw new AppError('FORBIDDEN', 'Cannot view statistics for administrators.', 403);
          }
        } else if (req.user.role === 'manager') {
          const isSelf = targetUserId === req.user.id;
          const isDirectReport = teamUserIds.includes(targetUserId);
          if (!isSelf && !isDirectReport) {
            throw new AppError('FORBIDDEN', 'You do not have permission to view statistics for this user.', 403);
          }
        }
      }

      // Date calculations
      const localToday = new Date(Date.now() + 330 * 60000); // Shift Date.now() by 330 minutes to get local IST time
      
      // Calculate start of current week (Monday)
      const currentDay = localToday.getUTCDay(); // 0 is Sunday, 1 is Monday...
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(Date.UTC(
        localToday.getUTCFullYear(),
        localToday.getUTCMonth(),
        localToday.getUTCDate() + distanceToMonday,
        0, 0, 0, 0
      ));

      const endOfWeek = new Date(Date.UTC(
        startOfWeek.getUTCFullYear(),
        startOfWeek.getUTCMonth(),
        startOfWeek.getUTCDate() + 6,
        23, 59, 59, 999
      ));

      // Fetch entries for this week with updated manager scoping
      const whereCondition = {
        work_date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      };

      if (targetUserId) {
        whereCondition.user_id = targetUserId;
      } else if (managerId) {
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
        const d = new Date(Date.UTC(
          localToday.getUTCFullYear(),
          localToday.getUTCMonth(),
          localToday.getUTCDate() - i
        ));
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
