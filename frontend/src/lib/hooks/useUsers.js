import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';

export function useUsers(params = {}, options = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.listUsers(params),
    ...options
  });
}
 
export function useTeamMembers(params = {}, options = {}) {
  return useQuery({
    queryKey: ['users', 'team', params],
    queryFn: () => usersApi.listTeamMembers(params),
    ...options
  });
}

export function useManagers(options = {}) {
  return useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () => usersApi.listManagers(),
    staleTime: 5 * 60 * 1000, // Cache managers list for 5 minutes
    ...options
  });
}

export function useInviteManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email) => usersApi.inviteManager(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }) => usersApi.changeUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useChangeUserManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, manager_ids }) => usersApi.changeUserManager(id, manager_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useChangeUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => usersApi.changeUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
