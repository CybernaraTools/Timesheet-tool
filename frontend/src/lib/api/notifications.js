import apiClient from './client';

export const listNotifications = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const queryString = query.toString();
  return apiClient(`/notifications${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  });
};

export const markNotificationAsRead = (id) =>
  apiClient(`/notifications/${id}/read`, {
    method: 'PATCH',
  });

export const markAllNotificationsAsRead = () =>
  apiClient('/notifications/read-all', {
    method: 'PATCH',
  });
