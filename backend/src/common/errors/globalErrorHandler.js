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
  } else if (err.code === 'P2010') {
    // Prisma Raw query failed (e.g. database user exceptions raised by stored function)
    statusCode = 400;
    responseError.code = 'DATABASE_EXCEPTION';
    let rawMsg = err.meta?.message || err.message || '';
    if (rawMsg.includes('ERROR:')) {
      rawMsg = rawMsg.split('ERROR:')[1].trim();
    }
    if (rawMsg.includes('\n')) {
      rawMsg = rawMsg.split('\n')[0].trim();
    }
    
    // Map specific database exception messages to correct client error codes
    if (rawMsg.includes('overlaps with an existing task')) {
      responseError.code = 'OVERLAPPING_ENTRY';
    } else if (rawMsg.includes('identical details already exists')) {
      responseError.code = 'DUPLICATE_ENTRY';
    }
    
    responseError.message = rawMsg || 'Database query execution failed.';
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
