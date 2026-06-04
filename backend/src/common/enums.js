const UserRole = Object.freeze({
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin'
});

const UserStatus = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
});

const OtpPurpose = Object.freeze({
  SIGNIN: 'signin',
  SIGNUP: 'signup',
  INVITE: 'invite'
});

const OutputStatus = Object.freeze({
  DONE: 'done',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DEFERRED: 'deferred'
});

const CategoryType = Object.freeze({
  SYSTEM: 'system',
  CUSTOM: 'custom'
});

const EditRequestStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
});

module.exports = {
  UserRole,
  UserStatus,
  OtpPurpose,
  OutputStatus,
  CategoryType,
  EditRequestStatus
};
