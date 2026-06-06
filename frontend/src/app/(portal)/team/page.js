'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTeamMembers, useManagers } from '@/lib/hooks/useUsers';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Users, User, ArrowRight } from 'lucide-react';

export default function TeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';

  // Read manager_id from query params for admin selection
  const managerIdQuery = searchParams.get('manager_id') || '';
  const [selectedManagerId, setSelectedManagerId] = useState(managerIdQuery);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries
  const { data: teamMembers = [], isLoading: loadingTeam } = useTeamMembers(
    isAdmin && selectedManagerId ? { manager_id: selectedManagerId } : {}
  );
  const { data: managers = [], isLoading: loadingManagers } = useManagers({
    enabled: typeof window !== 'undefined' && isAdmin
  });

  // Sync state with URL change
  useEffect(() => {
    setSelectedManagerId(managerIdQuery);
  }, [managerIdQuery]);

  // Reset page when team size or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [teamMembers.length, selectedManagerId]);

  const totalPages = Math.ceil(teamMembers.length / itemsPerPage);
  const paginatedMembers = teamMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleManagerChange = (e) => {
    const val = e.target.value;
    setSelectedManagerId(val);
    if (val) {
      router.push(`/team?manager_id=${val}`);
    } else {
      router.push('/team');
    }
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

  // Client-side role protection fallback
  if (role === 'employee') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md p-8 text-center">
        <h3 className="text-xl font-bold uppercase tracking-[1.5px] text-m-red">
          403 — Unauthorized
        </h3>
        <p className="text-sm font-light text-muted-text mt-2">
          Only managers and administrators are authorized to access the team roster.
        </p>
      </div>
    );
  }

  const actions = isAdmin && (
    <div className="w-56">
      <Select
        label="Filter by Manager"
        value={selectedManagerId}
        onChange={handleManagerChange}
        options={[
          { value: '', label: 'All Active Teams' },
          ...managers.map(m => ({ value: m.id, label: m.full_name }))
        ]}
        disabled={loadingManagers}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Directory"
        description={
          isAdmin
            ? "Administrative view of all personnel grouped by manager."
            : "Review reports, departments, and active statuses of your direct team."
        }
        actions={actions}
      />

      {loadingTeam ? (
        <SkeletonTable rows={5} cols={isAdmin ? 6 : 5} />
      ) : teamMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Empty Team Roster"
          description={
            selectedManagerId
              ? "This manager does not have any direct reports assigned yet."
              : "You do not have any direct reports assigned in the system."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-hairline bg-canvas rounded-md overflow-hidden animate-fade-in">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Name</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Department</Table.Head>
                  <Table.Head>Status</Table.Head>
                  {isAdmin && <Table.Head>Manager(s)</Table.Head>}
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedMembers.map((member) => (
                  <Table.Row key={member.id}>
                    <Table.Cell className="font-bold text-body-strong  tracking-[0.5px]">
                      {member.full_name}
                    </Table.Cell>
                    <Table.Cell>{member.email}</Table.Cell>
                    <Table.Cell className="capitalize">{member.department || 'N/A'}</Table.Cell>
                    <Table.Cell>{renderStatusBadge(member.status)}</Table.Cell>
                    {isAdmin && (
                      <Table.Cell className="text-xs text-muted-text">
                        {member.managers?.map(m => m.manager?.full_name).filter(Boolean).join(', ') || '-'}
                      </Table.Cell>
                    )}
                    <Table.Cell className="text-right">
                      <Link href={`/timesheet?user_id=${member.id}`}>
                        <Button
                          variant="text-link"
                          className="text-xs hover:text-bmw-blue inline-flex items-center gap-1"
                        >
                          View Timesheet <ArrowRight size={12} />
                        </Button>
                      </Link>
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
  );
}
