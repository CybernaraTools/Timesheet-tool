'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTeamMembers, useManagers } from '@/lib/hooks/useUsers';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Filter,
  X 
} from 'lucide-react';

// TreeNode Component for Rendering Hierarchy recursively
function TreeNode({ node, currentUser }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelf = node.id === currentUser?.id;

  return (
    <div className="space-y-3 text-left">
      {/* Node Card */}
      <div className={`p-4 bg-surface-card border rounded-md transition-all duration-200 hover:border-[#cc785c]/40 ${
        isSelf 
          ? 'border-[#cc785c]' 
          : node.role === 'manager' 
            ? 'border-hairline' 
            : 'border-hairline/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
              isSelf
                ? 'bg-[#cc785c]/20 border-[#cc785c] text-[#cc785c]'
                : node.role === 'manager'
                  ? 'bg-[#cc785c]/10 border-hairline text-[#cc785c]'
                  : 'bg-canvas border-hairline/60 text-muted-text'
            }`}>
              {node.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Profile Info */}
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-primary-text text-sm sm:text-base tracking-[0.5px]">
                  {node.full_name} {isSelf && <span className="text-xs text-[#cc785c] font-normal">(You)</span>}
                </span>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 tracking-wider rounded-sm ${
                  node.role === 'manager'
                    ? 'bg-[#cc785c]/15 text-[#cc785c] border border-[#cc785c]/30'
                    : node.role === 'admin'
                      ? 'bg-m-red/15 text-m-red border border-m-red/30'
                      : 'bg-canvas text-muted-text border border-hairline/60'
                }`}>
                  {node.role}
                </span>
              </div>
              <p className="text-xs text-muted-text font-normal lowercase leading-none">{node.email}</p>
            </div>
          </div>

          {/* Actions & Report toggles */}
          <div className="flex items-center justify-end gap-3 self-end sm:self-center">
            {hasChildren && (
              <Button
                variant="secondary"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs h-9 px-4 flex items-center gap-1.5"
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{node.children.length} {node.children.length === 1 ? 'Report' : 'Reports'}</span>
              </Button>
            )}

            <Link href={`/timesheet?user_id=${node.id}`}>
              <Button
                variant="secondary"
                className="text-xs h-9 px-4"
              >
                View Timesheet
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Nested Children Nodes */}
      {hasChildren && isExpanded && (
        <div className="pl-6 border-l border-hairline ml-5 space-y-4 pt-1">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuthStore();
  const role = currentUser?.role || 'employee';
  const isAdmin = role === 'admin';

  // Read filter values from URL query params
  const managerIdQuery = searchParams.get('manager_id') || '';
  const [selectedManagerId, setSelectedManagerId] = useState(managerIdQuery);

  // Queries
  const { data: teamMembers = [], isLoading: loadingTeam } = useTeamMembers({});
  const { data: managers = [], isLoading: loadingManagers } = useManagers({
    enabled: typeof window !== 'undefined' && isAdmin
  });

  // Sync state with URL changes
  useEffect(() => {
    setSelectedManagerId(managerIdQuery);
  }, [managerIdQuery]);

  // Handle filter changes
  const applyFilters = (managerId) => {
    const params = new URLSearchParams();
    if (managerId) params.set('manager_id', managerId);

    const qs = params.toString();
    router.push(`/team${qs ? `?${qs}` : ''}`);
  };

  const handleManagerChange = (e) => {
    const val = e.target.value;
    setSelectedManagerId(val);
    applyFilters(val);
  };

  const handleClearFilters = () => {
    setSelectedManagerId('');
    router.push('/team');
  };

  // Recursive Tree Builder
  const buildHierarchy = (members) => {
    const nodes = members.map(m => ({
      ...m,
      children: []
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const roots = [];

    nodes.forEach(node => {
      const managerIds = node.managers?.map(m => m.manager_id) || [];
      let isChild = false;

      managerIds.forEach(mid => {
        const parent = nodeMap.get(mid);
        if (parent) {
          if (!parent.children.some(c => c.id === node.id)) {
            parent.children.push(node);
          }
          isChild = true;
        }
      });

      if (!isChild) {
        roots.push(node);
      }
    });

    return roots;
  };

  // Render tree branch filters
  const getDisplayTree = () => {
    const fullTree = buildHierarchy(teamMembers);
    let displayTree = fullTree;

    // Filter by Manager (Admins only / client-side isolation)
    if (selectedManagerId) {
      const findManagerNode = (nodes, targetId) => {
        for (const node of nodes) {
          if (node.id === targetId) return node;
          if (node.children && node.children.length > 0) {
            const found = findManagerNode(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const managerNode = findManagerNode(fullTree, selectedManagerId);
      displayTree = managerNode ? [managerNode] : [];
    }

    return displayTree;
  };

  // Role Protection Fallback
  if (role === 'employee') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md p-8 text-center">
        <h3 className="text-xl font-bold uppercase tracking-[1.5px] text-m-red flex items-center gap-2">
          <AlertTriangle size={20} /> 403 — Unauthorized
        </h3>
        <p className="text-sm font-light text-muted-text mt-2">
          Only managers and administrators are authorized to access the team directory.
        </p>
      </div>
    );
  }

  const displayTree = getDisplayTree();
  const hasActiveFilters = !!selectedManagerId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Directory"
        description="Visualize reporting hierarchies and inspect report structures in an interactive tree view."
      />

      {/* Interactive Filters Panel */}
      {isAdmin && (
        <div className="p-6 bg-surface-card border border-hairline rounded-md space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-text">
            <Filter size={16} className="text-[#cc785c]" />
            <span>Filter Tree Hierarchy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Select
              label="Select Manager Focus"
              value={selectedManagerId}
              onChange={handleManagerChange}
              options={[
                { value: '', label: 'Full Organization Structure' },
                ...managers.map(m => ({ value: m.id, label: `${m.full_name} · ${m.email}` }))
              ]}
              disabled={loadingManagers}
            />

            {hasActiveFilters && (
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                className="text-xs w-full md:w-auto flex items-center justify-center gap-1"
              >
                <X size={14} /> Clear Filter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tree Hierarchy Display */}
      {loadingTeam ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md">
          <Spinner size="lg" className="text-[#cc785c]" />
          <span className="text-xs text-muted-text mt-4 tracking-wider uppercase font-semibold">Loading organization tree...</span>
        </div>
      ) : displayTree.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasActiveFilters ? "No Matching Nodes Found" : "Empty Team Roster"}
          description={
            hasActiveFilters
              ? "No employees or managers match your current filter settings."
              : "No personnel assignments have been registered in the system."
          }
          action={hasActiveFilters ? (
            <Button variant="primary" onClick={handleClearFilters} className="text-xs">
              Reset Filters
            </Button>
          ) : null}
        />
      ) : (
        <div className="p-6 bg-canvas border border-hairline rounded-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-hairline">
            <span className=" font-semibold  text-muted-text">
              Reporting Hierarchy ({teamMembers.length} active members)
            </span>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {displayTree.map(rootNode => (
              <TreeNode
                key={rootNode.id}
                node={rootNode}
                currentUser={currentUser}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
