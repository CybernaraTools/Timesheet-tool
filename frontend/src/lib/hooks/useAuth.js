import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useRequestOtp() {
  return useMutation({
    mutationFn: ({ email, purpose }) => authApi.requestOtp(email, purpose),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, code, purpose }) => authApi.verifyOtp(email, code, purpose),
  });
}

export function useCompleteSignup() {
  return useMutation({
    mutationFn: ({ verificationToken, username, password }) =>
      authApi.completeSignup(verificationToken, username, password),
  });
}

export function useCompleteInvite() {
  return useMutation({
    mutationFn: ({ inviteToken, otp, username, password }) =>
      authApi.completeInvite(inviteToken, otp, username, password),
  });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }) => authApi.login(username, password),
    onSuccess: (data) => {
      const token = data?.accessToken || data?.session?.access_token;
      const refresh = data?.refreshToken || data?.session?.refresh_token;
      if (token && data?.user) {
        setSession(token, refresh || null, data.user);
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });
}

export function useMe() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    enabled: !!accessToken,
    staleTime: 10 * 60 * 1000, // Cache current user info for 10 minutes
  });
}

export function useUpdateCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => authApi.updateCredentials(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
