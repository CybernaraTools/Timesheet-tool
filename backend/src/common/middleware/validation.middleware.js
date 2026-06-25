const { isEmail, isEnum, isUUID, minLength, isISO8601 } = require('class-validator');
const AppError = require('../errors/AppError');
const { UserRole, OtpPurpose, OutputStatus, UserStatus } = require('../enums');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  return isEmail(trimmed) && trimmed.endsWith('@cybernara.com');
}

function validateTimeFormat(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  // Format should be hh:mm or hh:mm:ss
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeStr);
}

const validators = {
  requestOtp: (req, res, next) => {
    const { email, purpose } = req.body;
    const errors = {};

    if (!validateEmail(email)) {
      errors.email = 'Email must be a valid @cybernara.com email address.';
    }

    if (!purpose || !isEnum(purpose, OtpPurpose)) {
      errors.purpose = `Purpose must be one of: ${Object.values(OtpPurpose).join(', ')}.`;
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  verifyOtp: (req, res, next) => {
    const { email, code, purpose } = req.body;
    const errors = {};

    if (!validateEmail(email)) {
      errors.email = 'Email must be a valid @cybernara.com email address.';
    }

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      errors.code = 'Verification code must be exactly 6 digits.';
    }

    if (!purpose || !isEnum(purpose, OtpPurpose)) {
      errors.purpose = `Purpose must be one of: ${Object.values(OtpPurpose).join(', ')}.`;
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  completeSignup: (req, res, next) => {
    const { verificationToken, username, password } = req.body;
    const errors = {};

    if (!verificationToken || typeof verificationToken !== 'string') {
      errors.verificationToken = 'Verification token is required.';
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.username = 'Username is required.';
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  completeInvite: (req, res, next) => {
    const { inviteToken, otp, username, password } = req.body;
    const errors = {};

    if (!inviteToken || typeof inviteToken !== 'string') {
      errors.inviteToken = 'Invite token is required.';
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      errors.otp = 'Verification code must be exactly 6 digits.';
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.username = 'Username is required.';
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  login: (req, res, next) => {
    const { username, password } = req.body;
    const errors = {};

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      errors.username = 'Username is required.';
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  createEntry: (req, res, next) => {
    const { work_date, client_id, category_id, task_title, description, start_time, end_time, output_status, comment, manager_ids } = req.body;
    const errors = {};

    // Validate work_date
    if (!work_date || !isISO8601(work_date)) {
      errors.work_date = 'Work date must be a valid ISO8601 date string (YYYY-MM-DD).';
    } else {
      const todayIST = dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD');
      const taskDateFormatted = dayjs(work_date).format('YYYY-MM-DD');
      if (taskDateFormatted > todayIST) {
        errors.work_date = 'work_date cannot be a future date.';
      }
    }

    if (client_id && !isUUID(client_id)) {
      errors.client_id = 'Client ID must be a valid UUID.';
    }

    if (!category_id || !isUUID(category_id)) {
      errors.category_id = 'Category ID is required and must be a valid UUID.';
    }

    if (!task_title || typeof task_title !== 'string' || task_title.trim().length === 0) {
      errors.task_title = 'Task title is required.';
    }

    if (!start_time || !validateTimeFormat(start_time)) {
      errors.start_time = 'Start time is required and must be in HH:MM format.';
    }

    if (!end_time || !validateTimeFormat(end_time)) {
      errors.end_time = 'End time is required and must be in HH:MM format.';
    }

    if (start_time && end_time && validateTimeFormat(start_time) && validateTimeFormat(end_time)) {
      // end_time must be after start_time
      const [sh, sm] = start_time.split(':').map(Number);
      const [eh, em] = end_time.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      if (endMinutes <= startMinutes) {
        errors.end_time = 'end_time must be after start_time.';
      }
    }

    if (!output_status || !isEnum(output_status, OutputStatus)) {
      errors.output_status = `Output status must be one of: ${Object.values(OutputStatus).join(', ')}.`;
    }

    if (!manager_ids || !Array.isArray(manager_ids) || manager_ids.length === 0) {
      errors.manager_ids = 'At least one manager must be specified.';
    } else {
      const invalidUuids = manager_ids.filter(id => !isUUID(id));
      if (invalidUuids.length > 0) {
        errors.manager_ids = 'All manager IDs must be valid UUIDs.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  updateEntry: (req, res, next) => {
    const { work_date, client_id, category_id, task_title, start_time, end_time, output_status, manager_ids } = req.body;
    const errors = {};

    if (work_date) {
      if (!isISO8601(work_date)) {
        errors.work_date = 'Work date must be a valid ISO8601 date string (YYYY-MM-DD).';
      } else {
        const todayIST = dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD');
        const taskDateFormatted = dayjs(work_date).format('YYYY-MM-DD');
        if (taskDateFormatted > todayIST) {
          errors.work_date = 'work_date cannot be a future date.';
        }
      }
    }

    if (client_id && client_id !== '' && !isUUID(client_id)) {
      errors.client_id = 'Client ID must be a valid UUID.';
    }

    if (category_id && !isUUID(category_id)) {
      errors.category_id = 'Category ID must be a valid UUID.';
    }

    if (task_title && (typeof task_title !== 'string' || task_title.trim().length === 0)) {
      errors.task_title = 'Task title cannot be empty.';
    }

    if (start_time && !validateTimeFormat(start_time)) {
      errors.start_time = 'Start time must be in HH:MM format.';
    }

    if (end_time && !validateTimeFormat(end_time)) {
      errors.end_time = 'End time must be in HH:MM format.';
    }

    // If both times are provided or if the handler needs to fetch and compare, we'll do it
    // here we just validate formats if provided. The route handler can also double-check relative to DB
    if (start_time && end_time && validateTimeFormat(start_time) && validateTimeFormat(end_time)) {
      const [sh, sm] = start_time.split(':').map(Number);
      const [eh, em] = end_time.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      if (endMinutes <= startMinutes) {
        errors.end_time = 'end_time must be after start_time.';
      }
    }

    if (output_status && !isEnum(output_status, OutputStatus)) {
      errors.output_status = `Output status must be one of: ${Object.values(OutputStatus).join(', ')}.`;
    }

    if (manager_ids !== undefined) {
      if (!Array.isArray(manager_ids) || manager_ids.length === 0) {
        errors.manager_ids = 'At least one manager must be specified if manager_ids is provided.';
      } else {
        const invalidUuids = manager_ids.filter(id => !isUUID(id));
        if (invalidUuids.length > 0) {
          errors.manager_ids = 'All manager IDs must be valid UUIDs.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  editRequest: (req, res, next) => {
    const { entry_id, reason } = req.body;
    const errors = {};

    if (!entry_id || !isUUID(entry_id)) {
      errors.entry_id = 'Entry ID is required and must be a valid UUID.';
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      errors.reason = 'Reason is required and must be at least 10 characters long.';
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  invite: (req, res, next) => {
    const { email } = req.body;
    const errors = {};

    if (!validateEmail(email)) {
      errors.email = 'Email must be a valid @cybernara.com email address.';
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  changeRole: (req, res, next) => {
    const { role } = req.body;
    const errors = {};

    if (!role || !isEnum(role, UserRole)) {
      errors.role = `Role must be one of: ${Object.values(UserRole).join(', ')}.`;
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  changeManager: (req, res, next) => {
    const { manager_ids } = req.body;
    const errors = {};

    if (manager_ids !== undefined) {
      if (!Array.isArray(manager_ids)) {
        errors.manager_ids = 'Manager IDs must be an array.';
      } else {
        const invalidUuids = manager_ids.filter(id => !isUUID(id));
        if (invalidUuids.length > 0) {
          errors.manager_ids = 'All Manager IDs must be valid UUIDs.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  },

  changeStatus: (req, res, next) => {
    const { status } = req.body;
    const errors = {};

    if (!status || !isEnum(status, UserStatus)) {
      errors.status = `Status must be one of: ${Object.values(UserStatus).join(', ')}.`;
    }

    if (Object.keys(errors).length > 0) {
      return next(new AppError('VALIDATION_ERROR', 'Validation failed.', 400, errors));
    }
    next();
  }
};

module.exports = validators;
