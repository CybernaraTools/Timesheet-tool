import { useAuthStore } from '../stores/authStore';

export async function apiClient(path, options = {}) {
  const { accessToken } = useAuthStore.getState();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  // Build full URL ensuring it doesn't double-slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    let body;
    try {
      body = await response.json();
    } catch (err) {
      throw {
        status: response.status,
        code: 'PARSING_ERROR',
        message: 'An unexpected response structure or server error occurred.',
        details: null,
      };
    }

    // Throw { status, ...body.error } as requested
    const errorBody = body?.error || {
      code: body?.code || 'UNKNOWN_ERROR',
      message: body?.message || 'An unknown error occurred.',
      details: body?.details || null,
    };

    throw {
      status: response.status,
      ...errorBody,
    };
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export default apiClient;
