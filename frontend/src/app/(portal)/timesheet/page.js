'use client';

import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DailyView from '@/components/timesheet/DailyView';

export default function TimesheetPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timesheet"
        description="Log and manage your daily tasks, output status, and project allocations."
      />
      <DailyView />
    </div>
  );
}
