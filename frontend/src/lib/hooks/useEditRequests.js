import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as editRequestsApi from '../api/editRequests';

export function useSubmitEditRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => editRequestsApi.submitEditRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editRequests'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useEditRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: ['editRequests', params],
    queryFn: () => editRequestsApi.listEditRequests(params),
    ...options
  });
}

export function useOwnEditRequests(options = {}) {
  return useQuery({
    queryKey: ['editRequests', 'mine'],
    queryFn: () => editRequestsApi.listOwnEditRequests(),
    ...options
  });
}

export function useMyApprovedEditRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: ['editRequests', 'my-approved', params],
    queryFn: () => editRequestsApi.listMyApprovedEditRequests(params),
    ...options
  });
}

export function useApproveEditRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => editRequestsApi.approveEditRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editRequests'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useRejectEditRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }) => editRequestsApi.rejectEditRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editRequests'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}
