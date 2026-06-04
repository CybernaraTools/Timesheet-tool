const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');

const notificationController = {
  // GET /notifications
  list: async (req, res, next) => {
    try {
      const { is_read, page, limit } = req.query;
      
      const where = { user_id: req.user.id };
      if (is_read !== undefined) {
        where.is_read = is_read === 'true';
      }

      const result = await paginate(prisma.notification, {
        page,
        limit,
        where,
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /notifications/:id/read
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notification) {
        throw new AppError('NOT_FOUND', 'Notification not found.', 404);
      }

      if (notification.user_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to modify this notification.', 403);
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.notification.update({
          where: { id },
          data: { is_read: true }
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /notifications/read-all
  markAllAsRead: async (req, res, next) => {
    try {
      await withUserContext(req.user.id, async (tx) => {
        return await tx.notification.updateMany({
          where: {
            user_id: req.user.id,
            is_read: false
          },
          data: {
            is_read: true
          }
        });
      });

      return res.status(200).json({ message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = notificationController;
