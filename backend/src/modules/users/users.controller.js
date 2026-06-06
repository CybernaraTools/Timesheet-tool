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
        include: {
          managers: {
            select: {
              manager_id: true,
              manager: {
                select: {
                  full_name: true,
                  email: true
                }
              }
            }
          }
        },
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
      if (req.user.role === 'admin' && !req.query.manager_id) {
        // Return all active users (managers/employees) except admins
        const allActiveUsers = await prisma.user.findMany({
          where: {
            status: 'active',
            role: { not: 'admin' }
          },
          include: {
            managers: {
              include: {
                manager: { select: { id: true, full_name: true, email: true } }
              }
            }
          },
          orderBy: { full_name: 'asc' }
        });
        return res.status(200).json(allActiveUsers);
      }

      let managerId = req.user.id;

      if (req.user.role === 'admin') {
        managerId = req.query.manager_id;
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
        where: {
          managers: { some: { manager_id: managerId } },
          status: 'active',
          role: { not: 'admin' }
        },
        include: {
          managers: {
            include: {
              manager: { select: { id: true, full_name: true, email: true } }
            }
          }
        },
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`\x1b[33m[DEV INVITE] Email: ${cleanEmail} -> Link: http://localhost:3000/invite/${token}\x1b[0m`);
      }
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

      // Resolve base frontend URL from ALLOWED_ORIGINS (e.g. http://localhost:3000)
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map(o => o.trim());
      const frontendUrl = allowedOrigins[0] || 'http://localhost:3000';

      // Send invite email via MS Graph API
      const subject = 'You have been invited to the Timesheet Portal';
      const body = `You have been invited to join the Timesheet Portal at Cybernara.\n\nClick the link below to accept your invitation (expires in 24 hours):\n${frontendUrl}/invite/${token}`;

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
      const updated = await withUserContext(req.user.id, async (tx) => {
        if (role === 'admin') {
          // Clear manager assignments (Admins cannot have managers)
          await tx.userManager.deleteMany({
            where: { employee_id: id }
          });
        }
        return await tx.user.update({
          where: { id },
          data: { role }
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
      const { manager_ids } = req.body;

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('NOT_FOUND', 'User not found.', 404);
      }

      if (targetUser.role === 'admin') {
        throw new AppError('VALIDATION_ERROR', 'Admins cannot be assigned a manager.', 400);
      }

      if (manager_ids) {
        if (!Array.isArray(manager_ids)) {
          throw new AppError('VALIDATION_ERROR', 'manager_ids must be an array.', 400);
        }
        if (manager_ids.includes(id)) {
          throw new AppError('VALIDATION_ERROR', 'A user cannot be their own manager.', 400);
        }

        // Validate target managers have role = 'manager' or 'admin'
        const targetManagers = await prisma.user.findMany({
          where: {
            id: { in: manager_ids },
            role: { in: ['manager', 'admin'] }
          }
        });
        if (targetManagers.length !== manager_ids.length) {
          throw new AppError('VALIDATION_ERROR', 'One or more target managers are invalid or do not have manager/admin role.', 400);
        }
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        // Clear existing manager assignments
        await tx.userManager.deleteMany({
          where: { employee_id: id }
        });

        // Insert new manager assignments
        if (manager_ids && manager_ids.length > 0) {
          await tx.userManager.createMany({
            data: manager_ids.map(mid => ({
              employee_id: id,
              manager_id: mid
            }))
          });
        }

        return await tx.user.findUnique({
          where: { id },
          include: {
            managers: {
              select: {
                manager_id: true,
                manager: { select: { id: true, full_name: true, email: true } }
              }
            }
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
  },

  // PATCH /users/:id/department (Manager/Admin)
  changeDepartment: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { department } = req.body;

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('NOT_FOUND', 'User not found.', 404);
      }

      // Managers can only change department/team for themselves or their direct reports
      if (req.user.role === 'manager') {
        const isReport = await prisma.userManager.findUnique({
          where: {
            employee_id_manager_id: {
              employee_id: id,
              manager_id: req.user.id
            }
          }
        });
        if (!isReport && id !== req.user.id) {
          throw new AppError('FORBIDDEN', 'You can only update team names for your direct reports.', 403);
        }
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.user.update({
          where: { id },
          data: { department: department ? department.trim() : null }
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = usersController;
