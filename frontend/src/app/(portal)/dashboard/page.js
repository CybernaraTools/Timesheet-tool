'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTeamSummary } from '@/lib/hooks/useReports';
import { useEntries } from '@/lib/hooks/useTimesheet';
import { useTeamMembers } from '@/lib/hooks/useUsers';
import { formatDuration } from '@/lib/utils/formatDuration';
import TeamSummaryCards from '@/components/reports/TeamSummaryCards';
import HoursByDayChart from '@/components/reports/HoursByDayChart';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { Clock, Layers, Calendar, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isManagerOrAdmin = ['manager', 'admin'].includes(role);

  const [selectedUserId, setSelectedUserId] = useState('');

  // --- Fetch Team Members for Filter ---
  const { data: teamMembers = [] } = useTeamMembers(undefined, {
    enabled: typeof window !== 'undefined' && isManagerOrAdmin
  });

  const dropdownOptions = useMemo(() => {
    if (!isManagerOrAdmin) return [];
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
  }, [role, user, teamMembers, isManagerOrAdmin]);

  // --- Manager/Admin View Data ---
  const { data: teamSummary, isLoading: loadingTeam } = useTeamSummary(
    selectedUserId ? { user_id: selectedUserId } : undefined,
    {
      enabled: isMountedAndUserRole(isManagerOrAdmin)
    }
  );

  // Helper function for safe enablement
  function isMountedAndUserRole(targetRole) {
    return typeof window !== 'undefined' && targetRole;
  }

  const formatLocalDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // --- Employee View Data ---
  const today = new Date();
  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const from = formatLocalDate(monday);
  const to = formatLocalDate(sunday);

  const { data: employeeEntries = [], isLoading: loadingEmployee } = useEntries({
    from,
    to
  }, {
    enabled: isMountedAndUserRole(!isManagerOrAdmin)
  });

  // Aggregate Employee metrics
  const getDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const totalMin = employeeEntries.reduce((sum, e) => {
    const durationMin = e.duration !== undefined ? e.duration : getDurationMinutes(e.start_time, e.end_time);
    return sum + durationMin;
  }, 0);

  const employeeTasksCount = employeeEntries.length;

  // Compile hours by day for employee
  const employeeHoursByDay = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(day);

    const dayMinutes = employeeEntries
      .filter(e => e.work_date.split('T')[0] === dateStr)
      .reduce((sum, e) => sum + (e.duration !== undefined ? e.duration : getDurationMinutes(e.start_time, e.end_time)), 0);

    employeeHoursByDay.push({
      date: dateStr,
      hours: Number((dayMinutes / 60).toFixed(1))
    });
  }

  const actions = (
    <div className="flex items-center gap-3 flex-wrap">
      {isManagerOrAdmin && (
        <div className="w-64">
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            options={dropdownOptions}
            className="!h-10 !py-1 text-sm"
            searchable={true}
          />
        </div>
      )}
      {role !== 'admin' && (
        <Link href="/timesheet/bulk">
          <Button variant="primary">
            <Plus size={14} /> Quick submit
          </Button>
        </Link>
      )}
    </div>
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.full_name || 'user'}. Here's your workspace overview.`}
        actions={actions}
      />

      {isManagerOrAdmin ? (
        // MANAGER/ADMIN VIEW
        <div className="space-y-6 animate-fade-in">
          {loadingTeam ? (
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
              {/* Team Summary Cards */}
              <TeamSummaryCards summary={teamSummary} />

              {/* Hours by Day Recharts Bar Chart */}
              <HoursByDayChart data={teamSummary?.hoursByDay || []} title={chartTitle} />
            </div>
          )}
        </div>
      ) : (
        // EMPLOYEE VIEW
        loadingEmployee ? (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonChart />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-card border border-hairline p-6 rounded-md flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted-text">
                    My Hours Logged This Week
                  </p>
                  <p className="text-3xl text-primary-text  tracking-[0.5px] font-serif">
                    {formatDuration(totalMin)}
                  </p>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-md text-[#1c69d4]">
                  <Clock size={24} />
                </div>
              </div>

              <div className="bg-surface-card border border-hairline p-6 rounded-md flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted-text">
                    Total Tasks This Week
                  </p>
                  <p className="text-3xl text-primary-text  tracking-[0.5px] font-serif">
                    {employeeTasksCount} Task{employeeTasksCount !== 1 && 's'}
                  </p>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-md text-[#0fa336]">
                  <Layers size={24} />
                </div>
              </div>
            </div>

            {/* Hours by Day Recharts Bar Chart */}
            <HoursByDayChart data={employeeHoursByDay} title="My daily hours logged" />
          </div>
        )
      )}
    </div>
  );
}
