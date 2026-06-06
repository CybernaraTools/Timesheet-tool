import apiClient from './client';

export const exportCsv = (filters = {}) =>
  apiClient('/reports/export/csv', {
    method: 'POST',
    body: JSON.stringify(filters),
  });

export const exportPdf = (filters = {}) =>
  apiClient('/reports/export/pdf', {
    method: 'POST',
    body: JSON.stringify(filters),
  });

export const getTeamSummary = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/reports/team-summary${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};
