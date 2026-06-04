const crypto = require('crypto');
const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');
const { sendMail } = require('../../common/helpers/msGraph');

const usersController = {
  // GET /users/me
  me: async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      if (!user) {
        throw new AppError('UNAUTHORIZED', 'User not found.', 401);
      }
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },

  // GET /users/managers (Protected, all roles)
  listManagers: async (req, res, next) => {
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: 'manager',
          status: 'active'
        },
        select: {
          id: true,
          full_name: true,
          email: true
        },
        orderBy: { full_name: 'asc' }
      });
      return res.status(200).json(managers);
    } catch (err) {
      next(err);
    }
  },

  // GET /users (Admin only)
  list: async (req, res, next) => {
    try {
      const { role, status, page, limit } = req.query;

      const where = {};
      if (role) {
        where.role = role;
      }
      if (status) {
        where.status = status;
      }

      const result = await paginate(prisma.user, {
        page,
        limit,
        where,
        orderBy: { email: 'asc' }
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /users/team (Manager/Admin)
  team: async (req, res, next) => {
    try {
      let managerId = req.user.id;

      if (req.user.role === 'admin') {
        const queryManagerId = req.query.manager_id;
        if (!queryManagerId) {
          throw new AppError('VALIDATION_ERROR', 'manager_id query parameter is required for administrators.', 400);
        }
        managerId = queryManagerId;
      }

      // Verify the manager exists and has manager role
      const managerUser = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!managerUser) {
        throw new AppError('NOT_FOUND', 'Manager not found.', 404);
      }

      if (managerUser.role !== 'manager' && managerUser.role !== 'admin') {
        throw new AppError('VALIDATION_ERROR', 'The specified user is not a manager.', 400);
      }

      const teamMembers = await prisma.user.findMany({
        where: { manager_id: managerId },
        orderBy: { full_name: 'asc' }
      });

      return res.status(200).json(teamMembers);
    } catch (err) {
      next(err);
    }
  },

  // POST /users/invite (Admin only)
  invite: async (req, res, next) => {
    try {
      const { email } = req.body;
      const cleanEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail }
      });
      if (existingUser) {
        throw new AppError('VALIDATION_ERROR', 'User with this email already exists.', 400);
      }

      // Generate cryptographically random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Save invite token to DB
      await prisma.inviteToken.create({
        data: {
          token,
          email: cleanEmail,
          invited_by: req.user.id,
          expires_at: expiresAt,
          used: false
        }
      });

      // Send invite email via MS Graph API
      const subject = 'You have been invited to the Timesheet Portal';
      const body = `You have been invited to join the Timesheet Portal at Cybernara.\n\nClick the link below to accept your invitation (expires in 24 hours):\nhttps://app.cybernara.com/invite/${token}`;

      const sent = await sendMail(cleanEmail, subject, body);
      if (!sent) {
        throw new AppError('EMAIL_SEND_FAILED', 'Failed to dispatch invite email.', 500);
      }

      return res.status(200).json({ message: 'Manager invitation sent successfully.' });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /users/:id/role (Admin only)
  changeRole: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (id === req.user.id) {
        throw new AppError('FORBIDDEN', 'Admins cannot change or demote their own role.', 403);
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('NOT_FOUND', 'User not found.', 404);
      }

      const updateData = { role };
      if (role === 'admin') {
        // Clear manager_id (Admins cannot have a manager_id, DB constraint)
        updateData.manager_id = null;
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.user.update({
          where: { id },
          data: updateData
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /users/:id/manager (Admin only)
  changeManager: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { manager_id } = req.body;

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('NOT_FOUND', 'User not found.', 404);
      }

      if (targetUser.role === 'admin') {
        throw new AppError('VALIDATION_ERROR', 'Admins cannot be assigned a manager.', 400);
      }

      if (manager_id) {
        if (manager_id === id) {
          throw new AppError('VALIDATION_ERROR', 'A user cannot be their own manager.', 400);
        }

        // Validate target manager has role = 'manager' or 'admin'
        const manager = await prisma.user.findUnique({ where: { id: manager_id } });
        if (!manager) {
          throw new AppError('NOT_FOUND', 'Target manager not found.', 404);
        }
        if (manager.role !== 'manager' && manager.role !== 'admin') {
          throw new AppError('VALIDATION_ERROR', 'Target manager must be a Manager or Admin.', 400);
        }
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.user.update({
          where: { id },
          data: {
            manager_id: manager_id || null
          }
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /users/:id/status (Admin only)
  changeStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (id === req.user.id) {
        throw new AppError('FORBIDDEN', 'You cannot suspend your own account.', 403);
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('NOT_FOUND', 'User not found.', 404);
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.user.update({
          where: { id },
          data: { status }
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = usersController;
