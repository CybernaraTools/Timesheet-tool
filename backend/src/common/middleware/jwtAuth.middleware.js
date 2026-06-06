const jwt = require('jsonwebtoken');
const prisma = require('../helpers/prisma');
const supabase = require('../helpers/supabase');
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

    let userId;
    try {
      const decodedToken = jwt.decode(token, { complete: true });
      if (!decodedToken) {
        return next(new AppError('UNAUTHORIZED', 'Access token is malformed.', 401));
      }

      const alg = decodedToken.header?.alg;

      if (alg === 'HS256') {
        let decodedPayload;
        try {
          // Try base64 decoded buffer first (standard for Supabase dashboard secrets)
          const secretBuffer = Buffer.from(jwtSecret, 'base64');
          decodedPayload = jwt.verify(token, secretBuffer);
        } catch (err) {
          // Fallback to raw string just in case
          decodedPayload = jwt.verify(token, jwtSecret);
        }
        userId = decodedPayload.sub;
      } else {
        // Asymmetric algorithm (e.g. ES256). Delegate verification to Supabase Auth API
        const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
        if (getUserError || !user) {
          console.error('[JWT Auth Error]: Supabase verification failed:', getUserError?.message || 'No user returned');
          return next(new AppError('UNAUTHORIZED', 'Access token is expired or invalid.', 401));
        }
        userId = user.id;
      }
    } catch (err) {
      console.error('[JWT Auth Error]: Verification exception:', err.name, err.message);
      return next(new AppError('UNAUTHORIZED', 'Access token is expired or invalid.', 401));
    }
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
