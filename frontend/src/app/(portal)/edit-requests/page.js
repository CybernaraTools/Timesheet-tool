'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  useOwnEditRequests,
  useEditRequests,
  useMyApprovedEditRequests,
  useApproveEditRequest,
  useRejectEditRequest
} from '@/lib/hooks/useEditRequests';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { FileEdit, Check, X, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatDate';

export default function EditRequestsPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isManagerOrAdmin = ['manager', 'admin'].includes(role);

  // Tabs for Manager/Admin: 'pending' | 'all' | 'reviewed'
  const [activeTab, setActiveTab] = useState('pending');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  // Queries
  const { data: ownRequestsData, isLoading: loadingOwn, refetch: refetchOwn } = useOwnEditRequests({
    enabled: typeof window !== 'undefined' && !isManagerOrAdmin
  });
  const ownRequests = ownRequestsData?.data || [];

  const { data: teamRequestsData, isLoading: loadingTeam, refetch: refetchTeam } = useEditRequests(
    isManagerOrAdmin ? (activeTab === 'pending' ? { status: 'pending' } : {}) : {},
    { enabled: typeof window !== 'undefined' && isManagerOrAdmin && activeTab !== 'reviewed' }
  );

  const { data: reviewedRequestsData, isLoading: loadingReviewed, refetch: refetchReviewed } = useMyApprovedEditRequests(
    {},
    { enabled: typeof window !== 'undefined' && isManagerOrAdmin && activeTab === 'reviewed' }
  );

  const isLoading = isManagerOrAdmin
    ? (activeTab === 'reviewed' ? loadingReviewed : loadingTeam)
    : loadingOwn;

  const currentRequestsList = isManagerOrAdmin
    ? (activeTab === 'reviewed' ? (reviewedRequestsData?.data || []) : (teamRequestsData?.data || []))
    : ownRequests;

  // Reset page when tab, role, or data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, role, currentRequestsList.length]);

  const totalPages = Math.ceil(currentRequestsList.length / itemsPerPage);
  const paginatedRequests = currentRequestsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRefetch = () => {
    if (isManagerOrAdmin) {
      if (activeTab === 'reviewed') refetchReviewed();
      else refetchTeam();
    } else {
      refetchOwn();
    }
  };

  // Mutations
  const approveMutation = useApproveEditRequest();
  const rejectMutation = useRejectEditRequest();

  const handleApprove = (id) => {
    if (window.confirm("Are you sure you want to approve this edit request? This will unlock the entry for editing.")) {
      approveMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Edit request approved and entry unlocked");
          handleRefetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to approve request");
        }
      });
    }
  };

  const handleRejectClick = (id) => {
    setRejectId(id);
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

    rejectMutation.mutate({ id: rejectId, reason: rejectionReason.trim() }, {
      onSuccess: () => {
        toast.success("Edit request rejected");
        setIsRejectModalOpen(false);
        handleRefetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to reject request");
      }
    });
  };

  const renderStatusBadge = (status) => {
    const statusMap = {
      pending: { variant: 'warning', label: 'Pending' },
      approved: { variant: 'success', label: 'Approved' },
      rejected: { variant: 'danger', label: 'Rejected' }
    };
    const config = statusMap[status] || { variant: 'muted', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isPendingActions = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Edit Requests"
        description={
          isManagerOrAdmin
            ? "Review and approve/reject timesheet edit requests submitted by your team members."
            : "Monitor the approval status of your timesheet lock-unlock requests."
        }
      />

      {isManagerOrAdmin ? (
        // MANAGER / ADMIN INTERFACE
        <div className="space-y-6">
          {/* Tab Switcher */}
          <div className="flex border-b border-hairline">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-bmw-blue text-primary-text'
                  : 'border-transparent text-muted-text hover:text-primary-text'
              }`}
            >
              Pending requests
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-bmw-blue text-primary-text'
                  : 'border-transparent text-muted-text hover:text-primary-text'
              }`}
            >
              All requests
            </button>
            <button
              onClick={() => setActiveTab('reviewed')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviewed'
                  ? 'border-bmw-blue text-primary-text'
                  : 'border-transparent text-muted-text hover:text-primary-text'
              }`}
            >
              Reviewed by me
            </button>
          </div>

          {isLoading ? (
            <SkeletonTable rows={5} cols={7} />
          ) : currentRequestsList.length === 0 ? (
            <EmptyState
              icon={FileEdit}
              title="No Edit Requests"
              description={
                activeTab === 'pending'
                  ? "There are no pending timesheet unlock requests from your team."
                  : activeTab === 'reviewed'
                  ? "You haven't reviewed any timesheet edit requests yet."
                  : "No edit requests found in system history."
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
                <Table>
                  <Table.Header>
                    <Table.Row className="bg-surface-soft">
                      <Table.Head>Employee</Table.Head>
                      <Table.Head>Work Date</Table.Head>
                      <Table.Head>Task Title</Table.Head>
                      <Table.Head>Request Reason</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head>Submitted At</Table.Head>
                      <Table.Head>Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedRequests.map((req) => (
                      <Table.Row key={req.id}>
                        <Table.Cell className="font-bold text-primary-text  tracking-[0.5px]">
                          {req.requester?.full_name}
                          <p className="text-[10px] text-muted-text font-light tracking-none lowercase mt-0.5">
                            {req.requester?.email}
                          </p>
                        </Table.Cell>
                        <Table.Cell>{req.entry?.work_date?.split('T')[0]}</Table.Cell>
                        <Table.Cell className="text-primary-text uppercase font-bold text-xs max-w-[120px] truncate">
                          {req.entry?.task_title}
                        </Table.Cell>
                        <Table.Cell className="text-xs text-body-text font-light max-w-xs break-words">
                          {req.reason}
                          {req.rejection_reason && (
                            <p className="text-[11px] text-m-red mt-1 font-light italic bg-surface-soft p-2 border border-m-red/20 rounded-sm">
                              Rejection Note: {req.rejection_reason}
                            </p>
                          )}
                        </Table.Cell>
                        <Table.Cell>{renderStatusBadge(req.status)}</Table.Cell>
                        <Table.Cell className="text-xs font-light">
                          {formatDate(req.created_at, 'MMM dd, yyyy HH:mm')}
                        </Table.Cell>
                        <Table.Cell>
                          {req.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleApprove(req.id)}
                                variant="secondary"
                                className="text-xs h-8 px-3 hover:bg-green-500/10 hover:text-green-500"
                                disabled={isPendingActions}
                              >
                                <CheckCircle2 size={13} /> Approve
                              </Button>
                              <Button
                                onClick={() => handleRejectClick(req.id)}
                                variant="outline"
                                className="text-xs h-8 px-3 hover:bg-m-red/10 hover:text-m-red"
                                disabled={isPendingActions}
                              >
                                <XCircle size={13} /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-text font-light">
                              Resolved
                            </span>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center pt-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(p) => setCurrentPage(p)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : loadingOwn ? (
        <SkeletonTable rows={5} cols={5} />
      ) : ownRequests.length === 0 ? (
        <EmptyState
          icon={FileEdit}
          title="No Requests Logged"
          description="You haven't submitted any timesheet edit requests yet. Lock-unlock requests can be generated directly from locked daily cards."
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row className="bg-surface-soft">
                  <Table.Head>Task Title</Table.Head>
                  <Table.Head>Work Date</Table.Head>
                  <Table.Head>Request Reason</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Submitted At</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedRequests.map((req) => (
                  <Table.Row key={req.id}>
                    <Table.Cell className="font-bold text-primary-text  tracking-[0.5px] max-w-[150px] truncate">
                      {req.entry?.task_title || 'Unknown Entry'}
                    </Table.Cell>
                    <Table.Cell>{req.entry?.work_date?.split('T')[0] || 'N/A'}</Table.Cell>
                    <Table.Cell className="text-xs text-body-text font-light max-w-xs break-words">
                      {req.reason}
                      {req.rejection_reason && (
                        <p className="text-[11px] text-m-red mt-1 font-light italic bg-surface-soft p-2 border border-m-red/20 rounded-sm">
                          Rejection Reason: {req.rejection_reason}
                        </p>
                      )}
                    </Table.Cell>
                    <Table.Cell>{renderStatusBadge(req.status)}</Table.Cell>
                    <Table.Cell className="text-xs font-light">
                      {formatDate(req.created_at, 'MMM dd, yyyy HH:mm')}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
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
