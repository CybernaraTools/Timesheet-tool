const prisma = require('../../common/helpers/prisma');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');

const categoriesController = {
  // GET /categories
  listActive: async (req, res, next) => {
    try {
      const { include_inactive } = req.query;
      const where = {};
      if (include_inactive !== 'true') {
        where.is_active = true;
      }
      const categories = await prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          is_active: true
        },
        orderBy: { name: 'asc' }
      });
      return res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  },

  // POST /categories
  create: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Category name is required.', 400);
      }

      const trimmedName = name.trim();
      const existing = await prisma.category.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive'
          }
        }
      });
      if (existing) {
        throw new AppError('DUPLICATE_CATEGORY', 'Category already exists. Please choose a different name.', 400);
      }

      const category = await withUserContext(req.user.id, async (tx) => {
        return await tx.category.create({
          data: {
            name: trimmedName,
            type: 'custom',
            created_by: req.user.id
          }
        });
      });

      return res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /categories/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, is_active } = req.body;

      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        throw new AppError('NOT_FOUND', 'Category not found.', 404);
      }

      const updateData = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          throw new AppError('VALIDATION_ERROR', 'Category name cannot be empty.', 400);
        }
        const trimmedName = name.trim();
        const existing = await prisma.category.findFirst({
          where: {
            name: {
              equals: trimmedName,
              mode: 'insensitive'
            },
            id: {
              not: id
            }
          }
        });
        if (existing) {
          throw new AppError('DUPLICATE_CATEGORY', 'Category already exists. Please choose a different name.', 400);
        }
        updateData.name = trimmedName;
      }
      if (is_active !== undefined) {
        if (typeof is_active !== 'boolean') {
          throw new AppError('VALIDATION_ERROR', 'is_active must be a boolean.', 400);
        }
        updateData.is_active = is_active;
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.category.update({
          where: { id },
          data: updateData
        });
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /categories/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        throw new AppError('NOT_FOUND', 'Category not found.', 404);
      }

      // Restrict deleting system categories
      if (category.type === 'system') {
        throw new AppError('FORBIDDEN', 'System categories cannot be deleted.', 403);
      }

      // Check whether any timesheet entries reference this category (orphan check)
      const usageCount = await prisma.timesheetEntry.count({
        where: { category_id: id }
      });

      if (usageCount > 0) {
        throw new AppError(
          'CATEGORY_IN_USE',
          'Cannot delete a category that is referenced by existing timesheet entries.',
          400
        );
      }

      await withUserContext(req.user.id, async (tx) => {
        return await tx.category.delete({
          where: { id }
        });
      });

      return res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = categoriesController;
