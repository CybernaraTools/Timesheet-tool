const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');

// Utility to parse time string HH:MM to JS Date (only time part matters for TIME columns)
function parseTimeToDate(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
  return date;
}

// Utility to format Date to HH:MM string for the API response
function formatTimeToStr(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    return dateVal.substring(0, 5); // If database returns string like "09:00:00"
  }
  const hours = dateVal.getHours().toString().padStart(2, '0');
  const minutes = dateVal.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Format a single entry record
function formatEntry(entry) {
  if (!entry) return null;
  return {
    ...entry,
    start_time: formatTimeToStr(entry.start_time),
    end_time: formatTimeToStr(entry.end_time)
  };
}

const timesheetController = {
  // GET /entries
  list: async (req, res, next) => {
    try {
      const { date, user_id, category_id, from, to, page, limit } = req.query;
      const where = {};

      // 1. Enforce scoping
      if (req.user.role === 'employee') {
        // Employees can only see their own entries
        where.user_id = req.user.id;
      } else if (req.user.role === 'manager') {
        // Managers can see own entries + direct reports
        const reports = await prisma.user.findMany({
          where: { manager_id: req.user.id },
          select: { id: true }
        });
        const allowedUserIds = [req.user.id, ...reports.map(r => r.id)];

        if (user_id) {
          if (!allowedUserIds.includes(user_id)) {
            throw new AppError('FORBIDDEN', 'You do not have permission to view entries for this user.', 403);
          }
          where.user_id = user_id;
        } else {
          where.user_id = { in: allowedUserIds };
        }
      } else if (req.user.role === 'admin') {
        // Admins can see everything
        if (user_id) {
          where.user_id = user_id;
        }
      }

      // 2. Filters
      if (category_id) {
        where.category_id = category_id;
      }
      if (date) {
        where.work_date = new Date(date);
      } else if (from || to) {
        where.work_date = {};
        if (from) {
          where.work_date.gte = new Date(from);
        }
        if (to) {
          where.work_date.lte = new Date(to);
        }
      }

      const result = await paginate(prisma.timesheetEntry, {
        page,
        limit,
        where,
        include: {
          client: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, full_name: true, email: true } }
        },
        orderBy: { work_date: 'desc' }
      });

      // Format time fields in data
      result.data = result.data.map(formatEntry);

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /entries/summary
  summary: async (req, res, next) => {
    try {
      const { from, to, user_id, category_id } = req.query;
      const where = {};

      // Role scoping (same as list)
      if (req.user.role === 'employee') {
        where.user_id = req.user.id;
      } else if (req.user.role === 'manager') {
        const reports = await prisma.user.findMany({
          where: { manager_id: req.user.id },
          select: { id: true }
        });
        const allowedUserIds = [req.user.id, ...reports.map(r => r.id)];

        if (user_id) {
          if (!allowedUserIds.includes(user_id)) {
            throw new AppError('FORBIDDEN', 'You do not have permission to view summary for this user.', 403);
          }
          where.user_id = user_id;
        } else {
          where.user_id = { in: allowedUserIds };
        }
      } else if (req.user.role === 'admin') {
        if (user_id) {
          where.user_id = user_id;
        }
      }

      if (category_id) {
        where.category_id = category_id;
      }
      if (from || to) {
        where.work_date = {};
        if (from) {
          where.work_date.gte = new Date(from);
        }
        if (to) {
          where.work_date.lte = new Date(to);
        }
      }

      // Group by work_date, category_id, client_id and sum duration_minutes
      const summaryData = await prisma.timesheetEntry.groupBy({
        by: ['work_date', 'category_id', 'client_id'],
        where,
        _sum: {
          duration_minutes: true
        }
      });

      // Hydrate with category/client names
      const hydratedData = await Promise.all(
        summaryData.map(async (group) => {
          let categoryName = 'Unknown';
          let clientName = 'Internal / None';

          if (group.category_id) {
            const cat = await prisma.category.findUnique({
              where: { id: group.category_id },
              select: { name: true }
            });
            if (cat) categoryName = cat.name;
          }

          if (group.client_id) {
            const cli = await prisma.client.findUnique({
              where: { id: group.client_id },
              select: { name: true }
            });
            if (cli) clientName = cli.name;
          }

          return {
            work_date: group.work_date,
            category_id: group.category_id,
            category_name: categoryName,
            client_id: group.client_id,
            client_name: clientName,
            total_minutes: group._sum.duration_minutes || 0,
            total_hours: ((group._sum.duration_minutes || 0) / 60).toFixed(2)
          };
        })
      );

      return res.status(200).json(hydratedData);
    } catch (err) {
      next(err);
    }
  },

  // GET /entries/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const entry = await prisma.timesheetEntry.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, full_name: true, email: true } }
        }
      });

      if (!entry) {
        throw new AppError('NOT_FOUND', 'Timesheet entry not found.', 404);
      }

      // Check visibility constraints
      if (req.user.role === 'employee' && entry.user_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to view this entry.', 403);
      } else if (req.user.role === 'manager') {
        const directReport = await prisma.user.findFirst({
          where: { id: entry.user_id, manager_id: req.user.id }
        });
        if (entry.user_id !== req.user.id && !directReport) {
          throw new AppError('FORBIDDEN', 'You do not have permission to view this entry.', 403);
        }
      }

      return res.status(200).json(formatEntry(entry));
    } catch (err) {
      next(err);
    }
  },

  // POST /entries
  create: async (req, res, next) => {
    try {
      const { work_date, client_id, category_id, task_title, description, start_time, end_time, output_status, comment } = req.body;

      // Single entry create: locks automatically
      const entry = await withUserContext(req.user.id, async (tx) => {
        return await tx.timesheetEntry.create({
          data: {
            user_id: req.user.id,
            work_date: new Date(work_date),
            client_id: client_id || null,
            category_id,
            task_title,
            description,
            start_time: parseTimeToDate(start_time),
            end_time: parseTimeToDate(end_time),
            output_status,
            comment,
            is_locked: true // entries are locked on submit
          }
        });
      });

      return res.status(201).json(formatEntry(entry));
    } catch (err) {
      next(err);
    }
  },

  // POST /entries/bulk
  createBulk: async (req, res, next) => {
    try {
      const { tasks } = req.body;

      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'An array of tasks is required.', 400);
      }

      // Manual DTO validation on the array items (including future date validation)
      const errors = [];
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      tasks.forEach((task, index) => {
        const taskErrors = {};
        if (!task.work_date || isNaN(Date.parse(task.work_date))) {
          taskErrors.work_date = 'Work date must be a valid date.';
        } else {
          if (new Date(task.work_date) > today) {
            taskErrors.work_date = 'work_date cannot be a future date.';
          }
        }
        if (!task.category_id) {
          taskErrors.category_id = 'Category ID is required.';
        }
        if (!task.task_title || typeof task.task_title !== 'string' || task.task_title.trim().length === 0) {
          taskErrors.task_title = 'Task title is required.';
        }
        if (!task.start_time || !task.end_time) {
          taskErrors.start_time = 'Start and end times are required.';
        } else {
          const [sh, sm] = task.start_time.split(':').map(Number);
          const [eh, em] = task.end_time.split(':').map(Number);
          if (sh * 60 + sm >= eh * 60 + em) {
            taskErrors.end_time = 'end_time must be after start_time.';
          }
        }
        if (!task.output_status) {
          taskErrors.output_status = 'Output status is required.';
        }

        if (Object.keys(taskErrors).length > 0) {
          errors.push({ index, errors: taskErrors });
        }
      });

      if (errors.length > 0) {
        throw new AppError('VALIDATION_ERROR', 'Validation failed for one or more tasks.', 400, { tasks: errors });
      }

      // Map time strings to postgres time format objects for json encoding
      // Wait, timesheet_bulk_submit(JSONB) expects standard JSON payload with time strings (e.g. "09:00").
      // Postgres cast `(v_task->>'start_time')::TIME` handles it perfectly!
      // So we can pass the array of tasks directly as strings.
      const formattedTasks = tasks.map(task => ({
        work_date: task.work_date,
        client_id: task.client_id || '',
        category_id: task.category_id,
        task_title: task.task_title,
        description: task.description || '',
        start_time: task.start_time,
        end_time: task.end_time,
        output_status: task.output_status,
        comment: task.comment || ''
      }));

      // Execute SQL function using the withUserContext transaction
      const resultJson = await withUserContext(req.user.id, async (tx) => {
        const rawRes = await tx.$queryRawUnsafe(
          'SELECT public.timesheet_bulk_submit($1::jsonb) as result',
          JSON.stringify(formattedTasks)
        );
        return rawRes[0].result;
      });

      return res.status(201).json({
        message: 'Bulk timesheet entries submitted successfully.',
        entry_ids: resultJson
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /entries/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { work_date, client_id, category_id, task_title, description, start_time, end_time, output_status, comment } = req.body;

      const entry = await prisma.timesheetEntry.findUnique({ where: { id } });
      if (!entry) {
        throw new AppError('NOT_FOUND', 'Timesheet entry not found.', 404);
      }

      // Check locking rules: Employee cannot edit locked entries
      if (req.user.role === 'employee') {
        if (entry.user_id !== req.user.id) {
          throw new AppError('FORBIDDEN', 'You do not have permission to edit this entry.', 403);
        }
        if (entry.is_locked) {
          throw new AppError('ENTRY_LOCKED', 'This timesheet entry is locked and cannot be edited.', 403);
        }
      } else if (req.user.role === 'manager') {
        const directReport = await prisma.user.findFirst({
          where: { id: entry.user_id, manager_id: req.user.id }
        });
        if (entry.user_id !== req.user.id && !directReport) {
          throw new AppError('FORBIDDEN', 'You do not have permission to edit this entry.', 403);
        }
      }

      // Prepare update payload
      const updateData = {};
      if (work_date) updateData.work_date = new Date(work_date);
      if (client_id !== undefined) updateData.client_id = client_id || null;
      if (category_id) updateData.category_id = category_id;
      if (task_title !== undefined) updateData.task_title = task_title;
      if (description !== undefined) updateData.description = description;
      if (output_status) updateData.output_status = output_status;
      if (comment !== undefined) updateData.comment = comment;

      // Handle times
      const effectiveStart = start_time || formatTimeToStr(entry.start_time);
      const effectiveEnd = end_time || formatTimeToStr(entry.end_time);

      if (start_time) updateData.start_time = parseTimeToDate(start_time);
      if (end_time) updateData.end_time = parseTimeToDate(end_time);

      // Re-validate times
      const [sh, sm] = effectiveStart.split(':').map(Number);
      const [eh, em] = effectiveEnd.split(':').map(Number);
      if (sh * 60 + sm >= eh * 60 + em) {
        throw new AppError('VALIDATION_ERROR', 'end_time must be after start_time.', 400, { end_time: 'end_time must be after start_time.' });
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.timesheetEntry.update({
          where: { id },
          data: updateData
        });
      });

      return res.status(200).json(formatEntry(updated));
    } catch (err) {
      next(err);
    }
  },

  // DELETE /entries/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const entry = await prisma.timesheetEntry.findUnique({ where: { id } });
      if (!entry) {
        throw new AppError('NOT_FOUND', 'Timesheet entry not found.', 404);
      }

      // Scoping: Manager can delete their own + direct reports'; Admin can delete any
      if (req.user.role === 'manager') {
        const directReport = await prisma.user.findFirst({
          where: { id: entry.user_id, manager_id: req.user.id }
        });
        if (entry.user_id !== req.user.id && !directReport) {
          throw new AppError('FORBIDDEN', 'You do not have permission to delete this entry.', 403);
        }
      }

      await withUserContext(req.user.id, async (tx) => {
        return await tx.timesheetEntry.delete({
          where: { id }
        });
      });

      return res.status(200).json({ message: 'Timesheet entry deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = timesheetController;
