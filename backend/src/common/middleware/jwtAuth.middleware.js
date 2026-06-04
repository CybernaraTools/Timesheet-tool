const jwt = require('jsonwebtoken');
const prisma = require('../helpers/prisma');
const AppError = require('../errors/AppError');

async function jwtAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('UNAUTHORIZED', 'Access token is missing or invalid.', 401));
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return next(new AppError('INTERNAL_SERVER_ERROR', 'JWT Secret is not configured on the server.', 500));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return next(new AppError('UNAUTHORIZED', 'Access token is expired or invalid.', 401));
    }

    // Supabase JWT stores the user's UUID in the 'sub' claim
    const userId = decoded.sub;
    if (!userId) {
      return next(new AppError('UNAUTHORIZED', 'Token claims are invalid.', 401));
    }

    // Look up the user in the database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return next(new AppError('UNAUTHORIZED', 'User associated with this token does not exist.', 401));
    }

    if (user.status === 'suspended') {
      return next(new AppError('FORBIDDEN', 'Your account has been suspended. Contact an administrator.', 403));
    }

    // Attach req.user with id, email, and role from db
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = jwtAuth;
