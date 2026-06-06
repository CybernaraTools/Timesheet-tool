const prisma = require('../../common/helpers/prisma');
const paginate = require('../../common/helpers/pagination');
const AppError = require('../../common/errors/AppError');

const notificationController = {
  // GET /notifications — always scoped to the requesting user's own notifications
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

  // PATCH /notifications/:id/read — DELETE the notification (dismissed = gone from DB)
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({ where: { id } });

      if (!notification) {
        throw new AppError('NOT_FOUND', 'Notification not found.', 404);
      }

      if (notification.user_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'You do not have permission to dismiss this notification.', 403);
      }

      // Delete instead of mark-as-read — disappears from DB immediately
      await prisma.notification.delete({ where: { id } });

      return res.status(200).json({ message: 'Notification dismissed.' });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /notifications/read-all — DELETE all notifications for this user
  markAllAsRead: async (req, res, next) => {
    try {
      await prisma.notification.deleteMany({
        where: { user_id: req.user.id }
      });

      return res.status(200).json({ message: 'All notifications dismissed.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = notificationController;
