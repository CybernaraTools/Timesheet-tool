import React, { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import LockBadge from './LockBadge';
import { OutputStatusBadge } from './EntryCard';
import { formatDuration } from '@/lib/utils/formatDuration';
import Table from '../ui/Table';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import { useAuthStore } from '@/lib/stores/authStore';
import { Pencil, Trash2, Send } from 'lucide-react';

export default function EntryTable({ entries, onEdit, onDelete, onRequestEdit }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const getDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when entries change (e.g. when filters are applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [entries.length]);

  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const entry = info.row.original;
        return (
          <div className="flex flex-col gap-1.5 items-start">
            <LockBadge isLocked={entry.is_locked} />
            <OutputStatusBadge status={entry.output_status} />
          </div>
        );
      }
    }),
    columnHelper.accessor('work_date', {
      header: 'Date',
      cell: info => {
        const val = info.getValue();
        if (!val) return '';
        return typeof val === 'string' ? val.split('T')[0] : val.toISOString().split('T')[0];
      }
    }),
    columnHelper.accessor('task_title', {
      header: 'Task',
      cell: info => {
        const entry = info.row.original;
        return (
          <div className="max-w-xs md:max-w-sm">
            <p className="font-semibold text-primary-text text-sm truncate">
              {entry.task_title}
            </p>
            {entry.description && (
              <p className="text-xs text-muted-text font-light mt-0.5 line-clamp-2 leading-relaxed">
                {entry.description}
              </p>
            )}
          </div>
        );
      }
    }),
    columnHelper.accessor('category.name', {
      header: 'Category',
      cell: info => info.getValue() || 'Uncategorized'
    }),
    columnHelper.accessor('client.name', {
      header: 'Client',
      cell: info => info.getValue() || '—'
    }),
    columnHelper.accessor('start_time', {
      header: 'Duration',
      cell: info => {
        const entry = info.row.original;
        const durationMin = entry.duration !== undefined ? entry.duration : getDurationMinutes(entry.start_time, entry.end_time);
        return (
          <div>
            <p className="font-medium text-primary-text text-xs">
              {entry.start_time?.substring(0, 5)} – {entry.end_time?.substring(0, 5)}
            </p>
            <p className="text-[11px] text-muted-text font-light mt-0.5">
              {formatDuration(durationMin)}
            </p>
          </div>
        );
      }
    }),
    columnHelper.accessor('user.email', {
      header: 'Employee',
      cell: info => {
        const entry = info.row.original;
        if (!entry.user) return <span className="text-muted-text">—</span>;
        return (
          <div className="flex flex-col max-w-[150px]">
            <span className="font-semibold text-primary-text text-xs truncate">
              {entry.user.full_name}
            </span>
            <span className="text-[11px] text-body-text font-normal mt-0.5 truncate">
              {entry.user.email}
            </span>
          </div>
        );
      }
    }),
    columnHelper.accessor('entry_managers', {
      header: 'Manager(s)',
      cell: info => {
        const entry = info.row.original;
        const managers = entry.entry_managers?.map(em => em.manager?.email || em.manager_id) || [];
        if (managers.length === 0) return <span className="text-muted-text">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {managers.map((email, i) => (
              <span key={i} className="text-[11px] bg-surface-soft text-primary-text px-1.5 py-0.5 border border-hairline rounded-full">
                {email}
              </span>
            ))}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const entry = info.row.original;
        const isOwnEntry = entry.user_id === user?.id;
 
        // Admin rules: full access
        if (isAdmin) {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                className="text-xs h-8 px-3"
                onClick={() => onEdit(entry)}
              >
                <Pencil size={12} /> Edit
              </Button>
              <Button
                variant="outline"
                className="text-xs h-8 px-3 hover:border-m-red/50 hover:text-m-red"
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          );
        }
 
        // Own entry rules: request edit if locked, edit/delete if unlocked
        if (isOwnEntry) {
          if (entry.is_locked) {
            return (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  className="text-xs h-8 px-3"
                  onClick={() => onRequestEdit(entry.id)}
                >
                  <Send size={12} /> Request edit
                </Button>
              </div>
            );
          } else {
            return (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  className="text-xs h-8 px-3"
                  onClick={() => onEdit(entry)}
                >
                  <Pencil size={12} /> Edit
                </Button>
                <Button
                  variant="outline"
                  className="text-xs h-8 px-3 hover:border-m-red/50 hover:text-m-red"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            );
          }
        }
 
        // Manager reviewing team entries: Edit only, no Delete
        if (isManager) {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                className="text-xs h-8 px-3"
                onClick={() => onEdit(entry)}
              >
                <Pencil size={12} /> Edit
              </Button>
            </div>
          );
        }
 
        // Default: no actions
        return <span className="text-muted-text">—</span>;
      }
    })
  ], [onEdit, onDelete, onRequestEdit, isAdmin, user]);

  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    return entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [entries, currentPage, itemsPerPage]);

  const table = useReactTable({
    data: paginatedEntries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
 
  if (entries.length === 0) {
    return null;
  }
 
  return (
    <div className="space-y-4">
      <Table>
        <Table.Header>
          {table.getHeaderGroups().map(headerGroup => (
            <Table.Row key={headerGroup.id} className="border-b border-hairline bg-surface-soft">
              {headerGroup.headers.map(header => (
                <Table.Head key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map(row => (
            <Table.Row key={row.id}>
              {row.getVisibleCells().map(cell => (
                <Table.Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

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
  );
}
