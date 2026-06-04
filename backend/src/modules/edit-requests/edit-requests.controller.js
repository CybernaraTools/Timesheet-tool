const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');
const notificationService = require('../notifications/notification.service');

const editRequestsController = {
  // POST /edit-requests (Employee only)
  submit: async (req, res, next) => {
    try {
      const { entry_id, reason } = req.body;

      // 1. Fetch timesheet entry and verify constraints
      const entry = await prisma.timesheetEntry.findUnique({
        where: { id: entry_id },
        include: {
          user: {
            select: {
              full_name: true,
              manager_id: true
            }
          }
        }
      });

      if (!entry) {
        throw new AppError('NOT_FOUND', 'Timesheet entry not found.', 404);
      }

      if (entry.user_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to request edits on this entry.', 403);
      }

      if (!entry.is_locked) {
        throw new AppError('VALIDATION_ERROR', 'This timesheet entry is already unlocked.', 400);
      }

      // 2. Verify no pending request already exists
      const existingPending = await prisma.editRequest.findFirst({
        where: {
          entry_id,
          status: 'pending'
        }
      });

      if (existingPending) {
        throw new AppError('DUPLICATE_PENDING_REQUEST', 'An edit request is already pending for this timesheet entry.', 409);
      }

      // 3. Create the edit request
      const editRequest = await withUserContext(req.user.id, async (tx) => {
        return await tx.editRequest.create({
          data: {
            entry_id,
            requested_by: req.user.id,
            reason,
            status: 'pending'
          }
        });
      });

      // 4. Send notification to the employee's manager
      const managerId = entry.user.manager_id;
      if (managerId) {
        const formattedDate = new Date(entry.work_date).toLocaleDateString('en-US');
        await notificationService.send({
          userId: managerId,
          title: 'Edit request submitted',
          body: `Employee ${entry.user.full_name} has requested to edit a timesheet entry for ${formattedDate}. Reason: ${reason}`,
          sendEmail: true,
          emailSubject: `Edit Request: ${entry.user.full_name} - ${formattedDate}`
        });
      } else {
        console.warn(`[Edit Request]: Employee ${entry.user_id} has no manager assigned. Notification not sent.`);
      }

      return res.status(201).json(editRequest);
    } catch (err) {
      next(err);
    }
  },

  // GET /edit-requests (Manager/Admin only)
  list: async (req, res, next) => {
    try {
      const { status, page, limit } = req.query;
      const where = {};

      if (status) {
        where.status = status;
      }

      if (req.user.role === 'manager') {
        // Manager sees requests for direct reports only
        const reports = await prisma.user.findMany({
          where: { manager_id: req.user.id },
          select: { id: true }
        });
        const reportIds = reports.map(r => r.id);

        where.requested_by = { in: reportIds };
      }

      const result = await paginate(prisma.editRequest, {
        page,
        limit,
        where,
        include: {
          entry: {
            select: {
              id: true,
              work_date: true,
              task_title: true,
              start_time: true,
              end_time: true
            }
          },
          requester: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /edit-requests/mine (Employee only)
  mine: async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const result = await paginate(prisma.editRequest, {
        page,
        limit,
        where: { requested_by: req.user.id },
        include: {
          entry: {
            select: {
              id: true,
              work_date: true,
              task_title: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /edit-requests/:id/approve (Manager/Admin only)
  approve: async (req, res, next) => {
    try {
      const { id } = req.params;

      const editRequest = await prisma.editRequest.findUnique({
        where: { id },
        include: {
          entry: true,
          requester: { select: { id: true, full_name: true, manager_id: true } }
        }
      });

      if (!editRequest) {
        throw new AppError('NOT_FOUND', 'Edit request not found.', 404);
      }

      if (editRequest.status !== 'pending') {
        throw new AppError('VALIDATION_ERROR', `This edit request is already ${editRequest.status}.`, 400);
      }

      // Check manager scope permissions
      if (req.user.role === 'manager' && editRequest.requester.manager_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to review this edit request.', 403);
      }

      // Perform approve mutations atomically
      const updatedRequest = await withUserContext(req.user.id, async (tx) => {
        // Unlock entry
        await tx.timesheetEntry.update({
          where: { id: editRequest.entry_id },
          data: { is_locked: false }
        });

        // Update request status
        return await tx.editRequest.update({
          where: { id },
          data: {
            status: 'approved',
            reviewed_by: req.user.id,
            reviewed_at: new Date()
          }
        });
      });

      // Notify the employee
      const formattedDate = new Date(editRequest.entry.work_date).toLocaleDateString('en-US');
      await notificationService.send({
        userId: editRequest.requested_by,
        title: 'Edit request approved',
        body: `Your edit request for ${formattedDate} has been approved. You can now edit the entry.`,
        sendEmail: true,
        emailSubject: `Approved: Edit Request for ${formattedDate}`
      });

      return res.status(200).json(updatedRequest);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /edit-requests/:id/reject (Manager/Admin only)
  reject: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'A rejection reason is required.', 400);
      }

      const editRequest = await prisma.editRequest.findUnique({
        where: { id },
        include: {
          entry: true,
          requester: { select: { id: true, full_name: true, manager_id: true } }
        }
      });

      if (!editRequest) {
        throw new AppError('NOT_FOUND', 'Edit request not found.', 404);
      }

      if (editRequest.status !== 'pending') {
        throw new AppError('VALIDATION_ERROR', `This edit request is already ${editRequest.status}.`, 400);
      }

      // Check manager scope permissions
      if (req.user.role === 'manager' && editRequest.requester.manager_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to review this edit request.', 403);
      }

      // Perform reject mutations
      const updatedRequest = await withUserContext(req.user.id, async (tx) => {
        return await tx.editRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            reviewed_by: req.user.id,
            reviewed_at: new Date()
          }
        });
      });

      // Notify the employee
      const formattedDate = new Date(editRequest.entry.work_date).toLocaleDateString('en-US');
      await notificationService.send({
        userId: editRequest.requested_by,
        title: 'Edit request rejected',
        body: `Your edit request for ${formattedDate} was rejected. Reason: ${reason}`,
        sendEmail: true,
        emailSubject: `Rejected: Edit Request for ${formattedDate}`
      });

      return res.status(200).json(updatedRequest);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = editRequestsController;
