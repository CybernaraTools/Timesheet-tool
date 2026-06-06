import { useQuery, useMutation } from '@tanstack/react-query';
import * as reportsApi from '../api/reports';
import { useAuthStore } from '../stores/authStore';

export function useExportCsv() {
  return useMutation({
    mutationFn: (filters) => reportsApi.exportCsv(filters),
  });
}

export function useExportPdf() {
  return useMutation({
    mutationFn: (filters) => reportsApi.exportPdf(filters),
  });
}

export function useTeamSummary(params = {}, options = {}) {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isManagerOrAdmin = ['manager', 'admin'].includes(role);

  return useQuery({
    queryKey: ['reports', 'team-summary', params],
    queryFn: () => reportsApi.getTeamSummary(params),
    ...options,
    enabled: !!(options.enabled !== false && typeof window !== 'undefined' && isManagerOrAdmin)
  });
}
