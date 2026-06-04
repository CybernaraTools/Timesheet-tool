const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');

const auditController = {
  // GET /audit-logs
  list: async (req, res, next) => {
    try {
      const { entity, user_id, action, from, to, page, limit } = req.query;

      const where = {};
      if (entity) {
        where.entity = entity;
      }
      if (user_id) {
        where.user_id = user_id;
      }
      if (action) {
        where.action = action;
      }
      if (from || to) {
        where.created_at = {};
        if (from) {
          where.created_at.gte = new Date(from);
        }
        if (to) {
          where.created_at.lte = new Date(to);
        }
      }

      const result = await paginate(prisma.auditLog, {
        page,
        limit,
        where,
        include: {
          user: {
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

  // GET /audit-logs/:id
  getDetail: async (req, res, next) => {
    try {
      const { id } = req.params;

      const auditLog = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        }
      });

      if (!auditLog) {
        throw new AppError('NOT_FOUND', 'Audit log entry not found.', 404);
      }

      return res.status(200).json(auditLog);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = auditController;
