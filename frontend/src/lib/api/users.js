import apiClient from './client';

export const listUsers = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/users${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const listTeamMembers = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/users/team${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const listManagers = () =>
  apiClient('/users/managers', {
    method: 'GET',
  });

export const inviteManager = (email) =>
  apiClient('/users/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const changeUserRole = (id, role) =>
  apiClient(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const changeUserManager = (id, manager_ids) =>
  apiClient(`/users/${id}/manager`, {
    method: 'PATCH',
    body: JSON.stringify({ manager_ids }),
  });

export const changeUserStatus = (id, status) =>
  apiClient(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const changeUserDepartment = (id, department) =>
  apiClient(`/users/${id}/department`, {
    method: 'PATCH',
    body: JSON.stringify({ department }),
  });
