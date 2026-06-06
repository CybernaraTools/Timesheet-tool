import apiClient from './client';

export const listClients = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/clients${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const createClient = (name) =>
  apiClient('/clients', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const updateClient = (id, data) =>
  apiClient(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteClient = (id) =>
  apiClient(`/clients/${id}`, {
    method: 'DELETE',
  });
