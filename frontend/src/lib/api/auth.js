import apiClient from './client';

export const requestOtp = (email, purpose) =>
  apiClient('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });

export const verifyOtp = (email, code, purpose) =>
  apiClient('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code, purpose }),
  });

export const completeSignup = (verificationToken, username, password) =>
  apiClient('/auth/signup/complete', {
    method: 'POST',
    body: JSON.stringify({ verificationToken, username, password }),
  });

export const completeInvite = (inviteToken, otp, username, password) =>
  apiClient('/auth/invite/complete', {
    method: 'POST',
    body: JSON.stringify({ inviteToken, otp, username, password }),
  });

export const login = (username, password) =>
  apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const getMe = () =>
  apiClient('/auth/me', {
    method: 'GET',
  });

export const updateCredentials = (data) =>
  apiClient('/auth/credentials', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
