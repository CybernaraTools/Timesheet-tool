const AppError = require('./AppError');

function globalErrorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('[Error Logger]:', err);

  let statusCode = 500;
  let responseError = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred on the server.',
    details: {}
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    responseError.code = err.code;
    responseError.message = err.message;
    responseError.details = err.details || {};
  } else if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
    statusCode = 400;
    responseError.code = 'VALIDATION_ERROR';
    responseError.message = err.message || 'Validation failed';
    responseError.details = err.details || {};
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    responseError.code = 'CONFLICT';
    responseError.message = 'A record with this unique identifier already exists.';
    responseError.details = { targets: err.meta?.target };
  } else if (err.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    responseError.code = 'NOT_FOUND';
    responseError.message = 'The requested resource could not be found.';
  }

  // If in non-production, attach the error stack for easier development
  if (process.env.NODE_ENV !== 'production' && !(err instanceof AppError)) {
    responseError.details = {
      ...responseError.details,
      stack: err.stack,
      rawError: err.message
    };
  }

  return res.status(statusCode).json({ error: responseError });
}

module.exports = globalErrorHandler;
