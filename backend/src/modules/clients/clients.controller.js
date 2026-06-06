const prisma = require('../../common/helpers/prisma');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');

const clientsController = {
  // GET /clients
  listActive: async (req, res, next) => {
    try {
      const { include_inactive } = req.query;
      const where = {};
      if (include_inactive !== 'true') {
        where.is_active = true;
      }
      const clients = await prisma.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          is_active: true
        },
        orderBy: { name: 'asc' }
      });
      return res.status(200).json(clients);
    } catch (err) {
      next(err);
    }
  },

  // POST /clients
  create: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Client name is required.', 400);
      }

      const client = await withUserContext(req.user.id, async (tx) => {
        return await tx.client.create({
          data: {
            name: name.trim(),
            created_by: req.user.id
          }
        });
      });

      return res.status(201).json(client);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /clients/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, is_active } = req.body;

      const client = await prisma.client.findUnique({ where: { id } });
      if (!client) {
        throw new AppError('NOT_FOUND', 'Client not found.', 404);
      }

      const updateData = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          throw new AppError('VALIDATION_ERROR', 'Client name cannot be empty.', 400);
        }
        updateData.name = name.trim();
      }
      if (is_active !== undefined) {
        if (typeof is_active !== 'boolean') {
          throw new AppError('VALIDATION_ERROR', 'is_active must be a boolean.', 400);
        }
        updateData.is_active = is_active;
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.client.update({
          where: { id },
          data: updateData
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /clients/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const client = await prisma.client.findUnique({ where: { id } });
      if (!client) {
        throw new AppError('NOT_FOUND', 'Client not found.', 404);
      }

      // Check if client is referenced in timesheet entries
      const usageCount = await prisma.timesheetEntry.count({
        where: { client_id: id }
      });

      if (usageCount > 0) {
        throw new AppError('CLIENT_IN_USE', 'Cannot delete a client that has logged timesheet entries. Deactivate instead.', 400);
      }

      await withUserContext(req.user.id, async (tx) => {
        return await tx.client.delete({
          where: { id }
        });
      });

      return res.status(200).json({ message: 'Client deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = clientsController;
