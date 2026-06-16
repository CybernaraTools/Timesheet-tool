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

// OTP request rate limiter: 5 requests per 1 minute per email/IP
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each email/IP to 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `otp_req:${email.trim().toLowerCase()}`;
    }
    return `otp_req:${req.ip}`;
  },
  handler: (req, res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 'Rate limit exceeded: Max 5 OTP requests per minute.', 429));
  }
});

// OTP verification rate limiter: 5 attempts per 1 minute per email/IP
const otpVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit to 5 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `otp_verify:${email.trim().toLowerCase()}`;
    }
    return `otp_verify:${req.ip}`;
  },
  handler: (req, res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 'Rate limit exceeded: Max 5 OTP verification attempts per minute.', 429));
  }
});

// Login rate limiter: 10 attempts per 15 minutes per username/IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const username = req.body?.username;
    if (username && typeof username === 'string') {
      return `login:${username.trim().toLowerCase()}`;
    }
    return `login:${req.ip}`;
  },
  handler: (req, res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 'Rate limit exceeded: Max 10 login attempts per 15 minutes.', 429));
  }
});

module.exports = {
  globalLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  loginLimiter
};
