import apiClient from './client';

export const listCategories = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/categories${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const createCategory = (name) =>
  apiClient('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const updateCategory = (id, data) =>
  apiClient(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteCategory = (id) =>
  apiClient(`/categories/${id}`, {
    method: 'DELETE',
  });
