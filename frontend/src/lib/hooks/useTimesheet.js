import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as timesheetApi from '../api/timesheet';

export function useEntries(params = {}) {
  return useQuery({
    queryKey: ['entries', params],
    queryFn: () => timesheetApi.listEntries(params),
    select: (res) => Array.isArray(res?.data) ? res.data : [],
  });
}

export function useEntrySummary(params = {}) {
  return useQuery({
    queryKey: ['entries', 'summary', params],
    queryFn: () => timesheetApi.getEntrySummary(params),
  });
}

export function useEntry(id) {
  return useQuery({
    queryKey: ['entries', id],
    queryFn: () => timesheetApi.getEntryById(id),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => timesheetApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useCreateBulkEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tasks) => timesheetApi.createBulkEntries(tasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => timesheetApi.updateEntry(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entries', variables.id] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => timesheetApi.deleteEntry(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entries', id] });
    },
  });
}
