'use client';

import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTeamSummary } from '@/lib/hooks/useReports';
import { useTeamMembers } from '@/lib/hooks/useUsers';
import PageHeader from '@/components/layout/PageHeader';
import TeamSummaryCards from '@/components/reports/TeamSummaryCards';
import HoursByDayChart from '@/components/reports/HoursByDayChart';
import ExportPanel from '@/components/reports/ExportPanel';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';

  const [selectedUserId, setSelectedUserId] = useState('');

  // --- Fetch Team Members for Filter ---
  const { data: teamMembers = [] } = useTeamMembers(undefined, {
    enabled: typeof window !== 'undefined' && ['manager', 'admin'].includes(role)
  });

  const dropdownOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    if (role === 'admin') {
      options.push({ value: '', label: 'All users (system-wide)' });
      teamMembers.forEach((member) => {
        if (!seen.has(member.id)) {
          seen.add(member.id);
          options.push({ value: member.id, label: member.email });
        }
      });
    } else if (role === 'manager') {
      options.push({ value: '', label: 'Entire team' });
      if (user) {
        seen.add(user.id);
        options.push({ value: user.id, label: `${user.email} (You)` });
      }
      teamMembers.forEach((member) => {
        if (!seen.has(member.id)) {
          seen.add(member.id);
          options.push({ value: member.id, label: member.email });
        }
      });
    }
    return options;
  }, [role, user, teamMembers]);

  const { data: teamSummary, isLoading } = useTeamSummary(
    selectedUserId ? { user_id: selectedUserId } : undefined,
    {
      enabled: typeof window !== 'undefined' && ['manager', 'admin'].includes(role)
    }
  );

  // Chart title calculation
  const chartTitle = useMemo(() => {
    if (!selectedUserId) {
      return role === 'admin' ? "All users daily hours logged" : "Team daily hours logged";
    }
    const match = dropdownOptions.find(o => o.value === selectedUserId);
    const email = match ? match.label.replace(' (You)', '') : 'User';
    return `Daily hours logged for ${email}`;
  }, [selectedUserId, role, dropdownOptions]);

  // Client-side guard check
  if (!['manager', 'admin'].includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md p-8 text-center">
        <h3 className="text-xl font-semibold text-m-red">
          403 — Access denied
        </h3>
        <p className="text-sm font-light text-muted-text mt-2">
          Only managers and administrators are authorized to access reports and export data.
        </p>
      </div>
    );
  }

  const headerActions = (
    <div className="w-64">
      <Select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        options={dropdownOptions}
        className="!h-10 !py-1 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        description="Review team statistics, monitor daily work allocations, and compile spreadsheet summaries."
        actions={headerActions}
      />

      {isLoading ? (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonChart />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <TeamSummaryCards summary={teamSummary} />

          {/* Daily Bar Chart */}
          <HoursByDayChart data={teamSummary?.hoursByDay || []} title={chartTitle} />

          {/* Export Panel */}
          <ExportPanel />
        </div>
      )}
    </div>
  );
}
