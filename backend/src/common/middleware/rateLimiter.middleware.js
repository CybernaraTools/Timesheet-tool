const rateLimit = require('express-rate-limit');
const AppError = require('../errors/AppError');

// Global rate limiter: 100 requests per 60 seconds per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 'Too many requests, please try again later.', 429));
  }
});

// OTP request rate limiter: 3 requests per 10 minutes per email address
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each email to 3 requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key on the lowercased email in the body to prevent cross-IP lockout of an email,
    // or IP if email is not provided
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return email.trim().toLowerCase();
    }
    return req.ip;
  },
  handler: (req, res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 'Rate limit exceeded: Max 3 OTP requests per 10 minutes per email.', 429));
  }
});

module.exports = {
  globalLimiter,
  otpLimiter
};
