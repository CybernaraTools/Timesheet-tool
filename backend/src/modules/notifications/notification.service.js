const prisma = require('../../common/helpers/prisma');
const { sendMail } = require('../../common/helpers/msGraph');

class NotificationService {
  /**
   * Send an in-app notification and optionally an email.
   *
   * @param {object} params
   * @param {string} params.userId - The ID of the recipient user
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body
   * @param {boolean} [params.sendEmail=false] - Whether to send an Outlook email
   * @param {string} [params.emailSubject] - Optional subject line for the email
   */
  async send({ userId, title, body, sendEmail = false, emailSubject }) {
    try {
      // 1. Create in-app notification
      const notification = await prisma.notification.create({
        data: {
          user_id: userId,
          title,
          body
        }
      });

      // 2. Dispatch email if requested
      if (sendEmail) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        if (user && user.email) {
          const subject = emailSubject || title;
          await sendMail(user.email, subject, body);
        } else {
          console.warn(`[Notification Service]: Could not send email because user with ID ${userId} has no email address.`);
        }
      }

      return notification;
    } catch (err) {
      console.error('[Notification Service] Error:', err.message);
      // We do not throw here to avoid blocking execution paths when notifications fail
      return null;
    }
  }
}

module.exports = new NotificationService();
