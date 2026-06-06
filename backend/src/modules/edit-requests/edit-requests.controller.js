const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');
const notificationService = require('../notifications/notification.service');

const editRequestsController = {
  // POST /edit-requests (Employee or Manager)
  submit: async (req, res, next) => {
    try {
      const { entry_id, reason } = req.body;

      const entry = await prisma.timesheetEntry.findUnique({
        where: { id: entry_id },
        include: {
          entry_managers: true,
          user: {
            select: {
              full_name: true,
              managers: { select: { manager_id: true } }
            }
          }
        }
      });

      if (!entry) throw new AppError('NOT_FOUND', 'Timesheet entry not found.', 404);
      if (entry.user_id !== req.user.id) throw new AppError('FORBIDDEN', 'You do not have permission to request edits on this entry.', 403);
      if (!entry.is_locked) throw new AppError('VALIDATION_ERROR', 'This timesheet entry is already unlocked.', 400);

      const existingPending = await prisma.editRequest.findFirst({
        where: { entry_id, status: 'pending' }
      });
      if (existingPending) throw new AppError('DUPLICATE_PENDING_REQUEST', 'An edit request is already pending for this timesheet entry.', 409);

      const editRequest = await withUserContext(req.user.id, async (tx) => {
        return await tx.editRequest.create({
          data: { entry_id, requested_by: req.user.id, reason, status: 'pending' }
        });
      });

      // Notify managers (both direct managers and managers explicitly assigned to this entry)
      const notifyManagerIds = new Set();
      (entry.user.managers || []).forEach(m => notifyManagerIds.add(m.manager_id));
      (entry.entry_managers || []).forEach(em => notifyManagerIds.add(em.manager_id));

      if (notifyManagerIds.size > 0) {
        const formattedDate = new Date(entry.work_date).toLocaleDateString('en-US');
        for (const mId of notifyManagerIds) {
          await notificationService.send({
            userId: mId,
            title: 'Edit request submitted',
            body: `${entry.user.full_name} has requested to edit a timesheet entry for ${formattedDate}. Reason: ${reason}`,
            sendEmail: true,
            emailSubject: `Edit Request: ${entry.user.full_name} - ${formattedDate}`
          });
        }
      }

      return res.status(201).json(editRequest);
    } catch (err) {
      next(err);
    }
  },

  // GET /edit-requests (Manager/Admin)
  // Manager sees: requests for entries that were SUBMITTED TO THIS MANAGER
  // i.e. entry_managers.manager_id = req.user.id
  list: async (req, res, next) => {
    try {
      const { status, page, limit } = req.query;
      const where = {};

      if (status) where.status = status;

      if (req.user.role === 'manager') {
        // Only requests where the entry was assigned to THIS manager
        where.entry = {
          entry_managers: { some: { manager_id: req.user.id } }
        };
      }
      // Admin sees all — no extra filter

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
            select: { id: true, full_name: true, email: true }
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
            select: { id: true, work_date: true, task_title: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /edit-requests/my-approved (Manager/Admin)
  // Returns requests that THIS user has reviewed (approved or rejected)
  myApproved: async (req, res, next) => {
    try {
      const { page, limit } = req.query;

      const result = await paginate(prisma.editRequest, {
        page,
        limit,
        where: {
          reviewed_by: req.user.id,
          status: { in: ['approved', 'rejected'] }
        },
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
            select: { id: true, full_name: true, email: true }
          }
        },
        orderBy: { reviewed_at: 'desc' }
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
          entry: {
            include: {
              entry_managers: true
            }
          },
          requester: {
            select: {
              id: true,
              full_name: true,
              managers: { select: { manager_id: true } }
            }
          }
        }
      });

      if (!editRequest) throw new AppError('NOT_FOUND', 'Edit request not found.', 404);
      if (editRequest.status !== 'pending') throw new AppError('VALIDATION_ERROR', `This edit request is already ${editRequest.status}.`, 400);

      if (req.user.role === 'manager') {
        const isManagerOfUser = editRequest.requester.managers.some(m => m.manager_id === req.user.id);
        const isAssignedManager = editRequest.entry.entry_managers.some(em => em.manager_id === req.user.id);
        if (!isManagerOfUser && !isAssignedManager) {
          throw new AppError('FORBIDDEN', 'You do not have permission to review this edit request.', 403);
        }
      }

      const updatedRequest = await withUserContext(req.user.id, async (tx) => {
        await tx.timesheetEntry.update({
          where: { id: editRequest.entry_id },
          data: { is_locked: false }
        });
        return await tx.editRequest.update({
          where: { id },
          data: { status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() }
        });
      });

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
          entry: {
            include: {
              entry_managers: true
            }
          },
          requester: {
            select: {
              id: true,
              full_name: true,
              managers: { select: { manager_id: true } }
            }
          }
        }
      });

      if (!editRequest) throw new AppError('NOT_FOUND', 'Edit request not found.', 404);
      if (editRequest.status !== 'pending') throw new AppError('VALIDATION_ERROR', `This edit request is already ${editRequest.status}.`, 400);

      if (req.user.role === 'manager') {
        const isManagerOfUser = editRequest.requester.managers.some(m => m.manager_id === req.user.id);
        const isAssignedManager = editRequest.entry.entry_managers.some(em => em.manager_id === req.user.id);
        if (!isManagerOfUser && !isAssignedManager) {
          throw new AppError('FORBIDDEN', 'You do not have permission to review this edit request.', 403);
        }
      }

      const updatedRequest = await withUserContext(req.user.id, async (tx) => {
        return await tx.editRequest.update({
          where: { id },
          data: { status: 'rejected', reviewed_by: req.user.id, reviewed_at: new Date() }
        });
      });

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
