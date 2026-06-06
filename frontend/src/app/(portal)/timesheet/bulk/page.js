'use client';

import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import BulkEntryForm from '@/components/forms/BulkEntryForm';

export default function BulkTimesheetPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Timesheet"
        description="Enter multiple task logs dynamically for a single day. All rows must have valid times and at least one manager assigned."
      />
      <BulkEntryForm />
    </div>
  );
}
