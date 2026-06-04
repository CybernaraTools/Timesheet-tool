const AppError = require('../errors/AppError');

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication is required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'You do not have permission to access this resource.', 403));
    }

    next();
  };
}

module.exports = requireRoles;
