import apiClient from './client';

export const listEntries = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/entries${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const getEntrySummary = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/entries/summary${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const getEntryById = (id) =>
  apiClient(`/entries/${id}`, {
    method: 'GET',
  });

export const createEntry = (data) =>
  apiClient('/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const createBulkEntries = (tasks) =>
  apiClient('/entries/bulk', {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  });

export const updateEntry = (id, data) =>
  apiClient(`/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteEntry = (id) =>
  apiClient(`/entries/${id}`, {
    method: 'DELETE',
  });
