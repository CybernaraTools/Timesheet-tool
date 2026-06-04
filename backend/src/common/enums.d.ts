export declare const UserRole: {
  readonly EMPLOYEE: "employee";
  readonly MANAGER: "manager";
  readonly ADMIN: "admin";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export declare const UserStatus: {
  readonly PENDING: "pending";
  readonly ACTIVE: "active";
  readonly SUSPENDED: "suspended";
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export declare const OtpPurpose: {
  readonly SIGNIN: "signin";
  readonly SIGNUP: "signup";
  readonly INVITE: "invite";
};
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export declare const OutputStatus: {
  readonly DONE: "done";
  readonly IN_PROGRESS: "in_progress";
  readonly BLOCKED: "blocked";
  readonly DEFERRED: "deferred";
};
export type OutputStatus = (typeof OutputStatus)[keyof typeof OutputStatus];

export declare const CategoryType: {
  readonly SYSTEM: "system";
  readonly CUSTOM: "custom";
};
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export declare const EditRequestStatus: {
  readonly PENDING: "pending";
  readonly APPROVED: "approved";
  readonly REJECTED: "rejected";
};
export type EditRequestStatus = (typeof EditRequestStatus)[keyof typeof EditRequestStatus];
