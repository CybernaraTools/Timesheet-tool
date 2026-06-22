import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Plus, ChevronLeft, ChevronRight, Layers, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEntries, useDeleteEntry } from '@/lib/hooks/useTimesheet';
import { useApproveEditRequest, useRejectEditRequest } from '@/lib/hooks/useEditRequests';
import { useTeamMembers } from '@/lib/hooks/useUsers';
import { formatDuration } from '@/lib/utils/formatDuration';
import EntryCard from './EntryCard';
import EntryTable from './EntryTable';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { SkeletonTable, SkeletonCard } from '../ui/Skeleton';
import Select from '../ui/Select';
import TimesheetEntryForm from '../forms/TimesheetEntryForm';
import EditRequestForm from '../forms/EditRequestForm';
import CreateCategoryModal from '../modals/CreateCategoryModal';
import { useSearchParams } from 'next/navigation';
import { subDays, addDays, format, parseISO } from 'date-fns';
import { useAuthStore } from '@/lib/stores/authStore';

export default function DailyView() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const searchParams = useSearchParams();
  const userId = searchParams.get('user_id') || undefined;

  const [selectedUserId, setSelectedUserId] = useState(userId || '');
  const [activeTimesheetTab, setActiveTimesheetTab] = useState('submitted'); // 'my_logs' | 'submitted'

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('cards'); // 'table' | 'cards'

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isRequestEditOpen, setIsRequestEditOpen] = useState(false);
  const [requestEditId, setRequestEditId] = useState(null);

  // Rejection modal state for reviewing team requests
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const approveMutation = useApproveEditRequest();
  const rejectMutation = useRejectEditRequest();

  // --- Fetch Team Members for Filter ---
  const { data: teamMembers = [] } = useTeamMembers(undefined, {
    enabled: typeof window !== 'undefined' && ['manager', 'admin'].includes(role)
  });

  const dropdownOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    if (role === 'admin') {
      options.push({ value: '', label: 'All Users' });
      teamMembers.forEach((member) => {
        if (!seen.has(member.id)) {
          seen.add(member.id);
          options.push({ value: member.id, label: member.email });
        }
      });
    } else if (role === 'manager') {
      options.push({ value: '', label: 'Entire Team' });
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

  // Queries & Mutations
  const { data: entries = [], isLoading, refetch } = useEntries({
    date: selectedDate,
    user_id: selectedUserId || undefined
  });
  const deleteMutation = useDeleteEntry();

  // Filter entries based on role and tab selection
  const filteredEntries = entries.filter(entry => {
    if (role === 'manager' && !selectedUserId) {
      if (activeTimesheetTab === 'my_logs') {
        return entry.user_id === user?.id;
      } else {
        return entry.user_id !== user?.id;
      }
    }
    return true;
  });

  const showCreateButton = 
    role === 'employee' || 
    (role === 'manager' && (
      (selectedUserId === user?.id) || 
      (!selectedUserId && activeTimesheetTab === 'my_logs')
    ));

  const emptyDescription = useMemo(() => {
    if (selectedUserId) {
      if (selectedUserId === user?.id) {
        return `You haven't logged any entries for ${selectedDate}.`;
      }
      const targetUser = teamMembers.find(m => m.id === selectedUserId);
      const displayName = targetUser?.full_name || targetUser?.username || targetUser?.email || 'The user';
      return `${displayName} hasn't logged any entries for ${selectedDate}.`;
    }

    if (role === 'admin') {
      return `No timesheet entries found for ${selectedDate}.`;
    }

    if (role === 'manager') {
      return activeTimesheetTab === 'my_logs'
        ? `You haven't logged any entries for ${selectedDate}.`
        : `No timesheet entries have been submitted to you for ${selectedDate}.`;
    }

    return `You haven't logged any entries for ${selectedDate}.`;
  }, [selectedUserId, user, selectedDate, role, activeTimesheetTab, teamMembers]);

  const getDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  // Calculate totals
  const totalMinutes = filteredEntries.reduce((sum, entry) => {
    const durationMin = entry.duration !== undefined ? entry.duration : getDurationMinutes(entry.start_time, entry.end_time);
    return sum + durationMin;
  }, 0);

  const handlePrevDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(subDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const current = parseISO(selectedDate);
    setSelectedDate(format(addDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setIsAddEditOpen(true);
  };

  const handleRequestEditClick = (entryId) => {
    setRequestEditId(entryId);
    setIsRequestEditOpen(true);
  };

  const handleDeleteClick = (entryId) => {
    if (window.confirm("Are you sure you want to delete this timesheet entry?")) {
      deleteMutation.mutate(entryId, {
        onSuccess: () => {
          toast.success("Entry deleted successfully");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete entry");
        }
      });
    }
  };

  const handleApproveEditRequest = (requestId) => {
    if (window.confirm("Are you sure you want to approve this edit request? This will unlock the entry for editing.")) {
      approveMutation.mutate(requestId, {
        onSuccess: () => {
          toast.success("Edit request approved and entry unlocked");
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to approve request");
        }
      });
    }
  };

  const handleRejectEditRequestClick = (requestId) => {
    setRejectRequestId(requestId);
    setRejectionReason('');
    setRejectionError('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters long");
      return;
    }

    rejectMutation.mutate({ id: rejectRequestId, reason: rejectionReason.trim() }, {
      onSuccess: () => {
        toast.success("Edit request rejected");
        setIsRejectModalOpen(false);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to reject request");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation & Actions bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-6 bg-surface-card border border-hairline rounded-md">
        {/* Left side: Date Selector & Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Date Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrevDay}
              className="p-2 bg-canvas border border-hairline hover:border-bmw-blue text-primary-text rounded-md transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-canvas text-primary-text px-4 py-2 border border-hairline focus:outline-none focus:border-bmw-blue font-medium text-sm text-center w-40 rounded-md"
            />
            <button
              onClick={handleNextDay}
              className="p-2 bg-canvas border border-hairline hover:border-bmw-blue text-primary-text rounded-md transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* User Dropdown Selector */}
          {['manager', 'admin'].includes(role) && (
            <div className="w-full sm:w-64">
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={dropdownOptions}
                className="!h-10 !py-1 text-sm"
                searchable={true}
              />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          {/* Card / Table Switcher */}
          <div className="flex border border-hairline bg-canvas rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${
                viewMode === 'table' ? 'bg-surface-card text-primary-text' : 'text-muted-text hover:text-primary-text'
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 transition-colors ${
                viewMode === 'cards' ? 'bg-surface-card text-primary-text' : 'text-muted-text hover:text-primary-text'
              }`}
              title="Card View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <Button
            variant="outline"
            className="h-10 text-xs sm:text-sm"
            onClick={() => setIsAddCategoryOpen(true)}
          >
            <Plus size={14} /> Add new category
          </Button>

          {role !== 'admin' && (
            <Link href={`/timesheet/bulk?date=${selectedDate}`}>
              <Button
                variant="primary"
                className="h-10"
              >
                <Plus size={14} /> Log timesheet
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab Switcher for Manager */}
      {role === 'manager' && !selectedUserId && (
        <div className="flex border-b border-hairline">
          <button
            onClick={() => setActiveTimesheetTab('submitted')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTimesheetTab === 'submitted'
                ? 'border-bmw-blue text-primary-text'
                : 'border-transparent text-muted-text hover:text-primary-text'
            }`}
          >
            Submitted to me
          </button>
          <button
            onClick={() => setActiveTimesheetTab('my_logs')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTimesheetTab === 'my_logs'
                ? 'border-bmw-blue text-primary-text'
                : 'border-transparent text-muted-text hover:text-primary-text'
            }`}
          >
            My logs
          </button>
        </div>
      )}

      {/* Summary Band */}
      {filteredEntries.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-surface-soft border border-hairline text-xs font-bold  text-body-text px-6 rounded-md">
          <span>Entries Logged: {filteredEntries.length}</span>
          <span>
            Total Time: <strong className="text-primary-text">{formatDuration(totalMinutes)}</strong>
          </span>
        </div>
      )}
 
      {/* Content Area */}
      {isLoading ? (
        viewMode === 'table' ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Timesheet Entries"
          description={emptyDescription}
          action={
            showCreateButton && (
              <Link href={`/timesheet/bulk?date=${selectedDate}`}>
                <Button variant="primary" className="text-xs">
                  Create first entry
                </Button>
              </Link>
            )
          }
        />
      ) : viewMode === 'table' ? (
        <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
          <EntryTable
            entries={filteredEntries}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onRequestEdit={handleRequestEditClick}
            onApproveRequest={handleApproveEditRequest}
            onRejectRequest={handleRejectEditRequestClick}
            approvingRequestId={approveMutation.isPending ? approveMutation.variables : null}
            rejectingRequestId={rejectMutation.isPending ? rejectMutation.variables?.id : null}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onRequestEdit={handleRequestEditClick}
              onApproveRequest={handleApproveEditRequest}
              onRejectRequest={handleRejectEditRequestClick}
              approvingRequestId={approveMutation.isPending ? approveMutation.variables : null}
              rejectingRequestId={rejectMutation.isPending ? rejectMutation.variables?.id : null}
            />
          ))}
        </div>
      )}

      {/* Edit Entry Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title="Edit Timesheet Entry"
      >
        <TimesheetEntryForm
          entry={editingEntry}
          selectedDate={selectedDate}
          onSuccess={() => {
            setIsAddEditOpen(false);
            refetch();
          }}
          onCancel={() => setIsAddEditOpen(false)}
        />
      </Modal>

      {/* Request Edit Modal */}
      <Modal
        isOpen={isRequestEditOpen}
        onClose={() => setIsRequestEditOpen(false)}
        title="Request Timesheet Unlock"
      >
        <EditRequestForm
          entryId={requestEditId}
          onSuccess={() => {
            setIsRequestEditOpen(false);
            refetch();
          }}
          onCancel={() => setIsRequestEditOpen(false)}
        />
      </Modal>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />

      {/* Reject Modal for review actions */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Edit Request"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-body-strong">
              Rejection reason *
            </label>
            <textarea
              placeholder="Explain why this unlock request is rejected (minimum 10 characters)"
              rows={4}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value.trim().length >= 10) setRejectionError('');
              }}
              className="w-full bg-canvas text-primary-text rounded-md p-3 border border-hairline focus:outline-none focus:border-bmw-blue focus:ring-1 focus:ring-bmw-blue/30 text-sm font-light"
            />
            {rejectionError && (
              <p className="text-xs text-m-red mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {rejectionError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <Button
              variant="secondary"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={rejectMutation.isPending}
              className="hover:bg-m-red hover:text-white"
            >
              Confirm Reject
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
