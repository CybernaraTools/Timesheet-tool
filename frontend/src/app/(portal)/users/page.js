'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  useUsers,
  useManagers,
  useChangeUserRole,
  useChangeUserManager,
  useChangeUserStatus
} from '@/lib/hooks/useUsers';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import MultiSelect from '@/components/ui/MultiSelect';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import InviteUserForm from '@/components/forms/InviteUserForm';
import { UserCog, Plus, AlertTriangle } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const currentRole = currentUser?.role || 'employee';

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Queries
  const limit = 10;
  const { data: usersData, isLoading: loadingUsers, refetch } = useUsers({
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit
  });
  const { data: managers = [], isLoading: loadingManagers } = useManagers();

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || { page: 1, totalPages: 1 };

  // Mutations
  const changeRoleMutation = useChangeUserRole();
  const changeManagerMutation = useChangeUserManager();
  const changeStatusMutation = useChangeUserStatus();

  // Route protection
  if (currentRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md">
        <h3 className="text-xl font-bold uppercase tracking-[1.5px] text-m-red flex items-center gap-2">
          <AlertTriangle size={20} /> 403 — Access Denied
        </h3>
        <p className="text-sm font-light text-muted-text mt-2">
          Administrative credentials are required to access user workspace policies.
        </p>
      </div>
    );
  }

  const handleChangeRole = (userId, newRole) => {
    changeRoleMutation.mutate({ id: userId, role: newRole }, {
      onSuccess: () => {
        toast.success("User role updated successfully");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update user role");
      }
    });
  };

  const handleChangeManager = (userId, newManagerIds) => {
    changeManagerMutation.mutate({ id: userId, manager_ids: newManagerIds }, {
      onSuccess: () => {
        toast.success("User hierarchy updated successfully");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update hierarchy");
      }
    });
  };

  const handleChangeStatus = (userId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    changeStatusMutation.mutate({ id: userId, status: nextStatus }, {
      onSuccess: () => {
        toast.success(`User status updated to ${nextStatus}`);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to modify user status");
      }
    });
  };

  const renderStatusBadge = (status) => {
    const maps = {
      active: { variant: 'success', label: 'Active' },
      suspended: { variant: 'danger', label: 'Suspended' },
      pending: { variant: 'warning', label: 'Pending' }
    };
    const config = maps[status] || { variant: 'muted', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const actions = (
    <Button
      variant="primary"
      onClick={() => setIsInviteOpen(true)}
      
    >
      <Plus size={14} className=" inline" /> Invite Manager
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Policies"
        description="Review directory profiles, modify security roles, configure management hierarchy, or suspend credentials."
        actions={actions}
      />

      {/* Filters bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-surface-card border border-hairline rounded-md">
        <Select
          label="Filter by Role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Roles' },
            { value: 'employee', label: 'Employee' },
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Admin' }
          ]}
        />
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'pending', label: 'Pending' }
          ]}
        />
      </div>

      {loadingUsers ? (
        <SkeletonTable rows={5} cols={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No Users Found"
          description="Try adjusting your filters or send a manager invitation."
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row className="bg-surface-soft">
                  <Table.Head>Name / Email</Table.Head>
                  <Table.Head>Username</Table.Head>
                  <Table.Head>Role Settings</Table.Head>
                  <Table.Head>Hierarchy (Manager)</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((u, index) => {
                  const isCurrent = u.id === currentUser?.id;
                  const shouldOpenUp = index >= users.length - 2;
                  return (
                    <Table.Row key={u.id}>
                      <Table.Cell className="font-bold text-primary-text tracking-[0.5px]">
                        {u.full_name || 'Unregistered User'}
                        <p className="text-[10px] text-muted-text font-normal lowercase tracking-none mt-0.5">
                          {u.email}
                        </p>
                      </Table.Cell>
                      <Table.Cell className="text-xs font-light text-body-text font-mono">
                        {u.username || '-'}
                      </Table.Cell>
                      <Table.Cell>
                        <Select
                          value={u.role}
                          disabled={isCurrent || changeRoleMutation.isPending}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className="w-32 capitalize text-xs !h-9 !py-1"
                          openUp={shouldOpenUp}
                          options={[
                            { value: 'employee', label: 'Employee' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' }
                          ]}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        {u.role === 'admin' ? (
                          <span className="text-xs text-muted-text font-light">N/A (Admin)</span>
                        ) : (
                          <div className="w-52 text-left">
                            <MultiSelect
                              options={managers
                                .filter(m => m.id !== u.id)
                                .map(m => ({ value: m.id, label: m.email }))}
                              selectedValues={u.managers?.map(m => m.manager_id) || []}
                              onChange={(newIds) => handleChangeManager(u.id, newIds)}
                              placeholder="No Manager (Direct)"
                              disabled={changeManagerMutation.isPending}
                              openUp={shouldOpenUp}
                              searchable={true}
                            />
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>{renderStatusBadge(u.status)}</Table.Cell>
                      <Table.Cell className="text-right">
                        <Button
                          variant="outline"
                          onClick={() => handleChangeStatus(u.id, u.status)}
                          disabled={isCurrent || changeStatusMutation.isPending}
                          className="text-xs h-8 px-2  tracking-[0.5px] hover:border-primary-text hover:text-primary-text"
                        >
                          {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Invite Manager Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Manager"
      >
        <InviteUserForm
          onSuccess={() => {
            setIsInviteOpen(false);
            refetch();
          }}
          onCancel={() => setIsInviteOpen(false)}
        />
      </Modal>
    </div>
  );
}
