const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validators = require('../../common/middleware/validation.middleware');
const jwtAuth = require('../../common/middleware/jwtAuth.middleware');
const { otpLimiter } = require('../../common/middleware/rateLimiter.middleware');

// Public endpoints
router.post('/request-otp', otpLimiter, validators.requestOtp, authController.requestOtp);
router.post('/verify-otp', validators.verifyOtp, authController.verifyOtp);
router.post('/signup/complete', validators.completeSignup, authController.signupComplete);
router.post('/invite/complete', validators.completeInvite, authController.inviteComplete);
router.post('/login', validators.login, authController.login);

// Protected endpoints
router.get('/me', jwtAuth, authController.me);
router.patch('/credentials', jwtAuth, authController.updateCredentials);

module.exports = router;
