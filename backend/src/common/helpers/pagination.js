/**
 * Helper to paginate database queries and return a standardized structure.
 *
 * @param {object} model - The Prisma model client (e.g. prisma.user)
 * @param {object} args - Arguments containing where, include, orderBy, page, limit
 * @returns {Promise<{data: Array, pagination: {page: number, limit: number, total: number, totalPages: number}}>}
 */
async function paginate(model, args = {}) {
  const page = Math.max(1, parseInt(args.page, 10) || 1);
  let limit = parseInt(args.limit, 10) || 50;
  
  // Cap limit at 200
  if (limit > 200) {
    limit = 200;
  }
  if (limit < 1) {
    limit = 50;
  }

  const skip = (page - 1) * limit;

  const queryArgs = {
    where: args.where || {},
    orderBy: args.orderBy || undefined,
  };

  if (args.include) {
    queryArgs.include = args.include;
  }
  if (args.select) {
    queryArgs.select = args.select;
  }

  const [total, data] = await Promise.all([
    model.count({ where: queryArgs.where }),
    model.findMany({
      ...queryArgs,
      skip,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}

module.exports = paginate;
