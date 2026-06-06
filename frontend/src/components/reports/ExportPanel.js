'use client';

import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useExportCsv, useExportPdf } from '@/lib/hooks/useReports';
import { useUsers, useTeamMembers } from '@/lib/hooks/useUsers';
import { useCategories } from '@/lib/hooks/useCategories';
import { useClients } from '@/lib/hooks/useClients';
import { useAuthStore } from '@/lib/stores/authStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import MultiSelect from '../ui/MultiSelect';
import { useState } from 'react';

export default function ExportPanel() {
  const { user } = useAuthStore();
  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const { data: usersData } = useUsers({ limit: 200 }, { enabled: typeof window !== 'undefined' && isAdmin });
  const { data: teamData = [] } = useTeamMembers(undefined, { enabled: typeof window !== 'undefined' && isManager });
  const { data: categories = [] } = useCategories();
  const { data: clients = [] } = useClients();

  // Build user list
  let userList = [];
  if (isAdmin)   userList = (usersData?.data || []).filter(u => u.role !== 'admin');
  else if (isManager) userList = user ? [user, ...teamData] : teamData;

  const exportCsv = useExportCsv();
  const exportPdf = useExportPdf();

  // Default both dates to TODAY (local time — avoids UTC off-by-one for IST)
  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [from, setFrom]                     = useState(todayStr);
  const [to,   setTo]                       = useState(todayStr);
  const [selectedUserIds,     setSelectedUserIds]     = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedClientIds,   setSelectedClientIds]   = useState([]);

  // ── Option builders ────────────────────────────────────────────────────────
  const userOptions = userList.map((u) => ({
    value: u.id,
    // Show "Full Name — email" so manager knows exactly who they're selecting
    label: `${u.full_name}  ·  ${u.email}`
  }));

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name
  }));

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name
  }));

  // ── Payload ────────────────────────────────────────────────────────────────
  const getPayload = () => ({
    from,
    to,
    user_ids:     selectedUserIds.length     > 0 ? selectedUserIds     : undefined,
    category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    client_ids:   selectedClientIds.length   > 0 ? selectedClientIds   : undefined,
  });

  const triggerDownload = (url, ext) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `timesheet-export.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsv = () => {
    if (!from || !to) { toast.error('Please select a valid date range'); return; }
    exportCsv.mutate(getPayload(), {
      onSuccess: (res) => { triggerDownload(res.url, 'xlsx'); toast.success('Export downloaded successfully'); },
      onError:   (err) => toast.error(err.message || 'Failed to export')
    });
  };

  const handleExportPdf = () => {
    if (!from || !to) { toast.error('Please select a valid date range'); return; }
    exportPdf.mutate(getPayload(), {
      onSuccess: (res) => { triggerDownload(res.url, 'pdf'); toast.success('PDF export downloaded successfully'); },
      onError:   (err) => toast.error(err.message || 'Failed to export PDF')
    });
  };

  const isPending = exportCsv.isPending || exportPdf.isPending;

  return (
    <div className="bg-surface-card border border-hairline p-6 rounded-md space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold tracking-[1.5px] text-primary-text">
          Data Export Panel
        </h3>
        <p className="text-xs font-light text-body-text mt-1">
          Select date ranges and filters to compile custom timesheet logs.
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="From Date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          disabled={isPending}
        />
        <Input
          label="To Date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={isPending}
        />
      </div>

      {/* Multi-Select Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-hairline">
        {/* Users */}
        {(isAdmin || isManager) && (
          <MultiSelect
            label="Filter by User"
            placeholder="All users"
            options={userOptions}
            selectedValues={selectedUserIds}
            onChange={setSelectedUserIds}
            disabled={isPending}
          />
        )}

        {/* Categories */}
        <MultiSelect
          label="Filter by Category"
          placeholder="All categories"
          options={categoryOptions}
          selectedValues={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
          disabled={isPending}
        />

        {/* Clients */}
        <MultiSelect
          label="Filter by Client"
          placeholder="All clients"
          options={clientOptions}
          selectedValues={selectedClientIds}
          onChange={setSelectedClientIds}
          disabled={isPending}
        />
      </div>

      {/* Selection Summary */}
      {(selectedUserIds.length > 0 || selectedCategoryIds.length > 0 || selectedClientIds.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedUserIds.length > 0 && (
            <span className="text-[10px] uppercase tracking-[1px] border border-hairline text-body-text px-2 py-1 rounded-sm">
              {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''}
            </span>
          )}
          {selectedCategoryIds.length > 0 && (
            <span className="text-[10px] uppercase tracking-[1px] border border-hairline text-body-text px-2 py-1 rounded-sm">
              {selectedCategoryIds.length} categor{selectedCategoryIds.length > 1 ? 'ies' : 'y'}
            </span>
          )}
          {selectedClientIds.length > 0 && (
            <span className="text-[10px] uppercase tracking-[1px] border border-hairline text-body-text px-2 py-1 rounded-sm">
              {selectedClientIds.length} client{selectedClientIds.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { setSelectedUserIds([]); setSelectedCategoryIds([]); setSelectedClientIds([]); }}
            className="text-[10px] uppercase tracking-[1px] text-m-red hover:underline px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-hairline">
        <Button
          onClick={handleExportCsv}
          variant="outline"
          isLoading={exportCsv.isPending}
          disabled={isPending}
          className="w-full sm:w-auto text-xs   h-11"
        >
          <FileSpreadsheet size={16} className=" inline" /> Export Excel
        </Button>
        <Button
          onClick={handleExportPdf}
          variant="primary"
          isLoading={exportPdf.isPending}
          disabled={isPending}
          className="w-full sm:w-auto text-xs   h-11"
        >
          <FileText size={16} className=" inline" /> Export PDF
        </Button>
      </div>
    </div>
  );
}
