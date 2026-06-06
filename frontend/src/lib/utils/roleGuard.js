/**
 * Checks if a user role is included in a list of allowed roles.
 * @param {string} userRole 
 * @param {string|string[]} allowedRoles 
 * @returns {boolean}
 */
export function hasRole(userRole, allowedRoles) {
  if (!userRole) return false;
  if (Array.isArray(allowedRoles)) {
    return allowedRoles.includes(userRole);
  }
  return userRole === allowedRoles;
}

/**
 * Checks if the role is employee.
 * @param {string} role 
 * @returns {boolean}
 */
export function isEmployee(role) {
  return role === 'employee';
}

/**
 * Checks if the role is manager.
 * @param {string} role 
 * @returns {boolean}
 */
export function isManager(role) {
  return role === 'manager';
}

/**
 * Checks if the role is admin.
 * @param {string} role 
 * @returns {boolean}
 */
export function isAdmin(role) {
  return role === 'admin';
}

/**
 * Checks if the role is manager or admin.
 * @param {string} role 
 * @returns {boolean}
 */
export function isManagerOrAdmin(role) {
  return role === 'manager' || role === 'admin';
}
