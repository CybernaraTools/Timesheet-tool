const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../common/helpers/prisma');
const supabase = require('../../common/helpers/supabase');
const AppError = require('../../common/errors/AppError');
const withUserContext = require('../../common/helpers/currentUser');
const { sendMail } = require('../../common/helpers/msGraph');

const authController = {
  // POST /auth/request-otp
  requestOtp: async (req, res, next) => {
    try {
      const { email, purpose } = req.body;
      const cleanEmail = email.trim().toLowerCase();

      // Generates 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      if (process.env.NODE_ENV === 'development') {
        console.log(`\x1b[33m[DEV OTP] Email: ${cleanEmail} -> Code: ${code}\x1b[0m`);
      }
      const codeHash = bcrypt.hashSync(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Save to database
      await prisma.otpCode.create({
        data: {
          email: cleanEmail,
          code_hash: codeHash,
          purpose,
          expires_at: expiresAt,
          attempts: 0,
          used: false
        }
      });

      // Send email via Microsoft Graph API
      const subject = 'Your Timesheet Portal verification code';
      const body = `Your one-time code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
      
      const sent = await sendMail(cleanEmail, subject, body);
      if (!sent) {
        throw new AppError('EMAIL_SEND_FAILED', 'Failed to dispatch verification email.', 500);
      }

      return res.status(200).json({ message: 'OTP sent successfully to your corporate inbox.' });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/verify-otp
  verifyOtp: async (req, res, next) => {
    try {
      const { email, code, purpose } = req.body;
      const cleanEmail = email.trim().toLowerCase();

      // Find matching, unexpired, unused code
      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          email: cleanEmail,
          purpose,
          used: false,
          expires_at: { gt: new Date() }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!otpRecord) {
        throw new AppError('OTP_EXPIRED', 'Verification code has expired or does not exist.', 400);
      }

      // Verify bcrypt hash
      const isMatch = bcrypt.compareSync(code, otpRecord.code_hash);
      if (!isMatch) {
        // Increment attempts
        const attempts = otpRecord.attempts + 1;
        if (attempts >= 5) {
          // Invalidate code by marking it used
          await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true }
          });
          throw new AppError('OTP_MAX_ATTEMPTS', 'Verification code invalidated due to too many failed attempts.', 400);
        } else {
          await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { attempts }
          });
          throw new AppError('INVALID_OTP', 'Invalid verification code.', 400);
        }
      }

      // Mark OTP as used (DB trigger will automatically delete it)
      // Except for the 'invite' purpose, which is marked used in inviteComplete
      if (purpose !== 'invite') {
        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { used: true }
        });
      }

      // Handle signin vs signup/invite
      if (purpose === 'signin') {
        // Find existing user in public.users
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: {
            managers: { select: { manager_id: true } }
          }
        });

        if (!user) {
          throw new AppError('NOT_FOUND', 'User record not found. Please sign up first.', 404);
        }

        if (user.status === 'suspended') {
          throw new AppError('FORBIDDEN', 'Your account has been suspended.', 403);
        }

        // Programmatic Server-Side Sign-In to get official Supabase session JWT
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: cleanEmail
        });

        if (linkError) {
          throw new AppError('AUTH_ERROR', linkError.message, 400);
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: linkData.properties.email_otp,
          type: 'magiclink'
        });

        if (sessionError) {
          throw new AppError('AUTH_ERROR', sessionError.message, 400);
        }

        return res.status(200).json({
          message: 'Authentication successful.',
          session: sessionData.session,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            username: user.username,
            full_name: user.full_name,
            manager_ids: user.managers?.map(m => m.manager_id) || []
          }
        });
      } else {
        // Return a short-lived token to complete signup/invite completion
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        const verificationToken = jwt.sign(
          { email: cleanEmail, purpose },
          jwtSecret,
          { expiresIn: '5m' }
        );

        return res.status(200).json({
          message: 'OTP verified successfully.',
          verificationToken
        });
      }
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/signup/complete
  signupComplete: async (req, res, next) => {
    try {
      const { verificationToken, username, password } = req.body;
      const cleanUsername = username.trim().toLowerCase();

      // Verify the short-lived token
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      let decoded;
      try {
        decoded = jwt.verify(verificationToken, jwtSecret);
      } catch (err) {
        throw new AppError('UNAUTHORIZED', 'Verification token has expired or is invalid.', 401);
      }

      if (decoded.purpose !== 'signup') {
        throw new AppError('VALIDATION_ERROR', 'Invalid verification token purpose.', 400);
      }

      const email = decoded.email;

      // Check if username is already taken in public.users
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername }
      });
      if (existingUser) {
        throw new AppError('VALIDATION_ERROR', 'Username is already taken.', 400, { username: 'Username is already taken.' });
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: cleanUsername }
      });

      if (authError) {
        throw new AppError('AUTH_ERROR', authError.message, 400);
      }

      const authUser = authData.user;
      const passwordHash = bcrypt.hashSync(password, 10);

      // Update public.users row created by trigger
      const updatedUser = await withUserContext(authUser.id, async (tx) => {
        return await tx.user.update({
          where: { id: authUser.id },
          data: {
            username: cleanUsername,
            password_hash: passwordHash,
            role: 'employee',
            status: 'active',
            created_via: 'signup'
          }
        });
      });

      // Obtain a genuine Supabase session JWT
      const loginRes = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginRes.error) {
        throw new AppError('AUTH_ERROR', loginRes.error.message, 400);
      }

      return res.status(201).json({
        message: 'Signup complete and account activated.',
        session: loginRes.data.session,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          username: updatedUser.username,
          full_name: updatedUser.full_name
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/invite/complete
  inviteComplete: async (req, res, next) => {
    try {
      const { inviteToken, otp, username, password } = req.body;
      const cleanUsername = username.trim().toLowerCase();

      // Find invite token
      const tokenRecord = await prisma.inviteToken.findUnique({
        where: { token: inviteToken }
      });

      if (!tokenRecord || tokenRecord.used || new Date() > tokenRecord.expires_at) {
        throw new AppError('INVITE_INVALID', 'Invite token is invalid, used, or expired.', 400);
      }

      const email = tokenRecord.email;

      // Verify OTP (purpose: invite)
      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          email,
          purpose: 'invite',
          used: false,
          expires_at: { gt: new Date() }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!otpRecord) {
        throw new AppError('OTP_EXPIRED', 'Verification code has expired or does not exist.', 400);
      }

      const isMatch = bcrypt.compareSync(otp, otpRecord.code_hash);
      if (!isMatch) {
        const attempts = otpRecord.attempts + 1;
        if (attempts >= 5) {
          await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true }
          });
          throw new AppError('OTP_MAX_ATTEMPTS', 'Verification code invalidated.', 400);
        } else {
          await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { attempts }
          });
          throw new AppError('INVALID_OTP', 'Invalid verification code.', 400);
        }
      }

      // Mark OTP as used
      await prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true }
      });

      // Check username uniqueness
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername }
      });
      if (existingUser) {
        throw new AppError('VALIDATION_ERROR', 'Username is already taken.', 400, { username: 'Username is already taken.' });
      }

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: cleanUsername }
      });

      if (authError) {
        throw new AppError('AUTH_ERROR', authError.message, 400);
      }

      const authUser = authData.user;
      const passwordHash = bcrypt.hashSync(password, 10);

      // Update public.users record
      const updatedUser = await withUserContext(authUser.id, async (tx) => {
        return await tx.user.update({
          where: { id: authUser.id },
          data: {
            username: cleanUsername,
            password_hash: passwordHash,
            role: 'manager', // Invited users are always Managers
            status: 'active',
            created_via: 'invite'
          }
        });
      });

      // Mark invite token as used (triggers deletion)
      await prisma.inviteToken.update({
        where: { id: tokenRecord.id },
        data: { used: true }
      });

      // Obtain session JWT
      const loginRes = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginRes.error) {
        throw new AppError('AUTH_ERROR', loginRes.error.message, 400);
      }

      return res.status(201).json({
        message: 'Manager account activated.',
        session: loginRes.data.session,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          username: updatedUser.username,
          full_name: updatedUser.full_name
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /auth/login
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const cleanUsername = username.trim().toLowerCase();

      // Find user in public.users
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
        include: {
          managers: { select: { manager_id: true } }
        }
      });

      if (!user) {
        throw new AppError('UNAUTHORIZED', 'Invalid username or password.', 401);
      }

      if (user.status === 'suspended') {
        throw new AppError('FORBIDDEN', 'Your account has been suspended.', 403);
      }

      // Contact Supabase to authenticate and generate a real JWT with RLS claims
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
      });

      if (error) {
        throw new AppError('UNAUTHORIZED', 'Invalid username or password.', 401);
      }

      return res.status(200).json({
        message: 'Login successful.',
        session: data.session,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          username: user.username,
          full_name: user.full_name,
          manager_ids: user.managers?.map(m => m.manager_id) || []
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /auth/me
  me: async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          managers: { select: { manager_id: true } }
        }
      });
      if (!user) {
        throw new AppError('UNAUTHORIZED', 'User not found.', 401);
      }
      return res.status(200).json({
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        full_name: user.full_name,
        manager_ids: user.managers?.map(m => m.manager_id) || [],
        department: user.department,
        status: user.status,
        created_via: user.created_via
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /auth/credentials
  updateCredentials: async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const updateData = {};

      if (username !== undefined) {
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length === 0) {
          throw new AppError('VALIDATION_ERROR', 'Username cannot be empty.', 400);
        }

        // Ensure username is not taken by another user
        const existing = await prisma.user.findUnique({
          where: { username: cleanUsername }
        });
        if (existing && existing.id !== req.user.id) {
          throw new AppError('VALIDATION_ERROR', 'Username is already taken.', 400);
        }
        updateData.username = cleanUsername;
      }

      if (password !== undefined) {
        if (password.length < 6) {
          throw new AppError('VALIDATION_ERROR', 'Password must be at least 6 characters.', 400);
        }

        // Sync to Supabase Auth
        const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
          password
        });
        if (error) {
          throw new AppError('AUTH_ERROR', error.message, 400);
        }

        updateData.password_hash = bcrypt.hashSync(password, 10);
      }

      if (Object.keys(updateData).length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Nothing to update.', 400);
      }

      const updated = await withUserContext(req.user.id, async (tx) => {
        return await tx.user.update({
          where: { id: req.user.id },
          data: updateData
        });
      });

      return res.status(200).json({
        message: 'Credentials updated successfully.',
        user: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
          username: updated.username,
          full_name: updated.full_name
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
