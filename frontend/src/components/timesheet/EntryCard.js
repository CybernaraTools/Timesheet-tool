import React from 'react';
import LockBadge from './LockBadge';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { formatDuration } from '@/lib/utils/formatDuration';
import { Clock, Briefcase, Tag, FileText, User, Pencil, Trash2, Send } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

export function OutputStatusBadge({ status }) {
  const mapping = {
    done: { variant: 'success', label: 'Done' },
    in_progress: { variant: 'info', label: 'In progress' },
    blocked: { variant: 'danger', label: 'Blocked' },
    deferred: { variant: 'muted', label: 'Deferred' },
  };
  const config = mapping[status] || { variant: 'muted', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function EntryCard({ entry, onEdit, onDelete, onRequestEdit }) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const isOwnEntry = entry.user_id === user?.id;

  const getDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  };

  const durationMin = entry.duration !== undefined ? entry.duration : getDurationMinutes(entry.start_time, entry.end_time);

  // Parse managers assigned to this entry
  const assignedManagers = entry.entry_managers?.map(em => em.manager?.email || em.manager_id) || [];

  // Determine if employee can delete: only when NOT locked
  // Once locked (manager has approved/processed), employee loses delete power
  const canEmployeeDelete = isOwnEntry && isEmployee && !entry.is_locked;
  const canEmployeeEdit = isOwnEntry && !entry.is_locked;

  return (
    <div className="bg-surface-card border border-hairline p-5 rounded-md flex flex-col justify-between gap-4 hover:border-bmw-blue/40 transition-all duration-150">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LockBadge isLocked={entry.is_locked} />
            <OutputStatusBadge status={entry.output_status} />
          </div>
          <span className="text-[10px] text-muted-text font-light">
            {entry.work_date?.split('T')[0]}
          </span>
        </div>

        {/* Task Title */}
        <div>
          <p className="text-sm font-semibold text-primary-text line-clamp-1">
            {entry.task_title}
          </p>
          {entry.description && (
            <p className="text-xs text-body-text font-light mt-1 line-clamp-2 leading-relaxed">
              {entry.description}
            </p>
          )}
        </div>

        {/* Category & Client Details */}
        <div className="space-y-1 pt-2 border-t border-hairline text-xs font-light text-body-text">
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-muted-text" />
            <span>Category: <strong className="font-medium text-primary-text">{entry.category?.name || 'Uncategorized'}</strong></span>
          </div>
          {entry.client && (
            <div className="flex items-center gap-2">
              <Briefcase size={12} className="text-muted-text" />
              <span>Client: <strong className="font-medium text-primary-text">{entry.client?.name}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-muted-text" />
            <span>
              Time: <strong className="font-medium text-primary-text">{entry.start_time?.substring(0, 5)} – {entry.end_time?.substring(0, 5)}</strong> ({formatDuration(durationMin)})
            </span>
          </div>
        </div>

        {/* Sent by Employee */}
        {entry.user && (
          <div className="pt-2 border-t border-hairline">
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-text flex items-center gap-1.5 mb-1">
              <User size={10} /> Sent by
            </p>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-primary-text">
                {entry.user.full_name}
              </span>
              <span className="text-[11px] text-body-text font-normal mt-0.5">
                {entry.user.email}
              </span>
            </div>
          </div>
        )}

        {/* Assigned Managers */}
        {assignedManagers.length > 0 && (
          <div className="pt-2 border-t border-hairline">
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-text flex items-center gap-1.5 mb-1">
              <User size={10} /> Sent to
            </p>
            <div className="flex flex-wrap gap-1">
              {assignedManagers.map((mgrName, i) => (
                <span key={i} className="text-[11px] bg-surface-soft text-primary-text px-1.5 py-0.5 border border-hairline rounded-full">
                  {mgrName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        {entry.comment && (
          <div className="text-[11px] text-muted-text font-light italic bg-surface-soft p-2 border border-hairline rounded-md flex items-start gap-1">
            <FileText size={10} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{entry.comment}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-hairline">
        {/* Admin: edit + delete */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="flex-1 h-9 text-xs"
              onClick={() => onEdit(entry)}
            >
              <Pencil size={13} /> Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs hover:border-m-red/50 hover:text-m-red"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 size={13} /> Delete
            </Button>
          </div>
        )}

        {/* Employee own entry */}
        {!isAdmin && isOwnEntry && (
          entry.is_locked ? (
            <Button
              variant="outline"
              className="w-full h-9 text-xs"
              onClick={() => onRequestEdit(entry.id)}
            >
              <Send size={13} /> Request edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="flex-1 h-9 text-xs"
                onClick={() => onEdit(entry)}
              >
                <Pencil size={13} /> Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs hover:border-m-red/50 hover:text-m-red"
                onClick={() => onDelete(entry.id)}
              >
                <Trash2 size={13} /> Delete
              </Button>
            </div>
          )
        )}

        {/* Manager reviewing team entries: Edit only, no Delete */}
        {isManager && !isOwnEntry && (
          <Button
            variant="secondary"
            className="w-full h-9 text-xs"
            onClick={() => onEdit(entry)}
          >
            <Pencil size={13} /> Edit
          </Button>
        )}
      </div>
    </div>
  );
}
