import apiClient from './client';

export const submitEditRequest = (data) =>
  apiClient('/edit-requests', {
    method: 'POST',
    body: JSON.stringify(data), // entry_id, reason
  });

export const listEditRequests = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/edit-requests${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const listOwnEditRequests = () =>
  apiClient('/edit-requests/mine', {
    method: 'GET',
  });

export const listMyApprovedEditRequests = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/edit-requests/my-approved${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const approveEditRequest = (id) =>
  apiClient(`/edit-requests/${id}/approve`, {
    method: 'PATCH',
  });

export const rejectEditRequest = (id, reason) =>
  apiClient(`/edit-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
