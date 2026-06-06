import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateBulkEntries } from '@/lib/hooks/useTimesheet';
import { useClients } from '@/lib/hooks/useClients';
import { useCategories } from '@/lib/hooks/useCategories';
import { useManagers } from '@/lib/hooks/useUsers';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMe } from '@/lib/hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MultiSelect from '../ui/MultiSelect';
import Spinner from '../ui/Spinner';

export default function BulkEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get('date');
  const { user } = useAuthStore();
  const { data: me } = useMe();

  const { data: clients = [] } = useClients();
  const { data: categories = [] } = useCategories();
  const { data: managers = [], isLoading: loadingManagers } = useManagers();
  const filteredManagers = managers.filter(m => m.id !== user?.id);

  const createBulk = useCreateBulkEntries();

  const todayLocal = new Date();
  const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
  const defaultDate = dateParam || todayStr;

  const createEmptyRow = (defaultManagers = []) => ({
    id: Math.random().toString(36).substring(7),
    work_date: defaultDate,
    category_id: '',
    client_id: '',
    task_title: '',
    description: '',
    start_time: '',
    end_time: '',
    output_status: 'done',
    comment: '',
    manager_ids: defaultManagers,
    isExpanded: true
  });

  const [rows, setRows] = useState(() => [createEmptyRow()]);
  const [errors, setErrors] = useState({}); // format: { [rowId]: { field: 'message' } }

  // Auto-select manager(s) of the employee by default once loaded
  useEffect(() => {
    if (me?.manager_ids && me.manager_ids.length > 0) {
      setRows(prevRows =>
        prevRows.map(row =>
          row.manager_ids.length === 0
            ? { ...row, manager_ids: me.manager_ids }
            : row
        )
      );
    }
  }, [me]);

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow(me?.manager_ids || [])]);
  };

  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      toast.error("You must submit at least one task");
      return;
    }
    setRows(rows.filter(r => r.id !== id));
    const newErrors = { ...errors };
    delete newErrors[id];
    setErrors(newErrors);
  };

  const handleFieldChange = (rowId, field, value) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));

    // Clear specific field error on change
    if (errors[rowId]?.[field]) {
      setErrors({
        ...errors,
        [rowId]: {
          ...errors[rowId],
          [field]: null
        }
      });
    }
  };

  const handleManagerToggle = (rowId, managerId, checked) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const manager_ids = checked
          ? [...row.manager_ids, managerId]
          : row.manager_ids.filter(id => id !== managerId);
        return { ...row, manager_ids };
      }
      return row;
    }));

    if (errors[rowId]?.manager_ids) {
      setErrors({
        ...errors,
        [rowId]: {
          ...errors[rowId],
          manager_ids: null
        }
      });
    }
  };

  const toggleExpand = (id) => {
    setRows(rows.map(r => r.id === id ? { ...r, isExpanded: !r.isExpanded } : r));
  };

  const validateForm = () => {
    const newErrors = {};
    let hasErrors = false;

    rows.forEach((row, idx) => {
      const rowErrors = {};

      if (!row.work_date) {
        rowErrors.work_date = "Work date is required";
      } else {
        const selectedDate = new Date(row.work_date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
          rowErrors.work_date = "Work date cannot be in the future";
        }
      }

      if (!row.category_id) {
        rowErrors.category_id = "Category is required";
      }

      if (!row.task_title || row.task_title.trim().length < 2) {
        rowErrors.task_title = "Task title must be at least 2 characters";
      }

      const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!row.start_time || !timeRegex.test(row.start_time)) {
        rowErrors.start_time = "Start time is required (HH:mm)";
      }

      if (!row.end_time || !timeRegex.test(row.end_time)) {
        rowErrors.end_time = "End time is required (HH:mm)";
      }

      if (row.start_time && row.end_time && timeRegex.test(row.start_time) && timeRegex.test(row.end_time)) {
        const [startH, startM] = row.start_time.split(':').map(Number);
        const [endH, endM] = row.end_time.split(':').map(Number);
        const startVal = startH * 60 + startM;
        const endVal = endH * 60 + endM;
        if (endVal <= startVal) {
          rowErrors.end_time = "End time must be after start time";
        }
      }

      if (!row.manager_ids || row.manager_ids.length === 0) {
        rowErrors.manager_ids = "Please select a manager";
      }

      if (Object.keys(rowErrors).length > 0) {
        newErrors[row.id] = rowErrors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please resolve validation errors in the highlighted rows");
      // Expand all rows that have errors
      setRows(rows.map(r => errors[r.id] || Object.keys(errors).length > 0 ? { ...r, isExpanded: true } : r));
      return;
    }

    const payload = rows.map(r => ({
      work_date: r.work_date,
      category_id: r.category_id,
      client_id: r.client_id || null,
      task_title: r.task_title.trim(),
      description: r.description.trim() || null,
      start_time: r.start_time,
      end_time: r.end_time,
      output_status: r.output_status,
      comment: r.comment.trim() || null,
      manager_ids: r.manager_ids,
    }));

    createBulk.mutate(payload, {
      onSuccess: () => {
        toast.success(`Successfully submitted ${rows.length} timesheet entries`);
        router.push('/timesheet');
      },
      onError: (err) => {
        toast.error(err.message || "Failed to submit bulk entries");
      }
    });
  };

  const isSubmitting = createBulk.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {rows.map((row, index) => {
          const rowErrors = errors[row.id] || {};
          return (
            <div
              key={row.id}
              className={`bg-surface-card border ${
                Object.keys(rowErrors).length > 0 ? 'border-m-red' : 'border-hairline'
              } rounded-md`}
            >
              {/* Row Header */}
              <div className="bg-surface-soft px-6 py-4 flex items-center justify-between border-b border-hairline rounded-t-md">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs uppercase tracking-[1px] text-body-strong">
                    Task #{index + 1}
                  </span>
                  {row.task_title && (
                    <span className="text-xs text-muted-text font-light truncate max-w-xs hidden sm:inline">
                      — {row.task_title}
                    </span>
                  )}
                  {Object.keys(rowErrors).length > 0 && (
                    <span className="text-[10px] font-bold text-m-red uppercase tracking-[1px] border border-m-red px-1 py-0.5 rounded-sm">
                      Validation Error
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.id)}
                    className="p-1 text-muted-text hover:text-primary-text transition-colors"
                  >
                    {row.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="p-1 text-muted-text hover:text-m-red transition-colors"
                    disabled={isSubmitting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Row Fields */}
              {row.isExpanded && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Date */}
                    <Input
                      label="Work Date"
                      type="date"
                      value={row.work_date}
                      onChange={(e) => handleFieldChange(row.id, 'work_date', e.target.value)}
                      error={rowErrors.work_date}
                      disabled={isSubmitting}
                    />

                    {/* Output Status */}
                    <Select
                      label="Status"
                      value={row.output_status}
                      onChange={(e) => handleFieldChange(row.id, 'output_status', e.target.value)}
                      options={[
                        { value: 'done', label: 'Done' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'blocked', label: 'Blocked' },
                        { value: 'deferred', label: 'Deferred' }
                      ]}
                      disabled={isSubmitting}
                    />

                    {/* Category */}
                    <Select
                      label="Category"
                      value={row.category_id}
                      onChange={(e) => handleFieldChange(row.id, 'category_id', e.target.value)}
                      error={rowErrors.category_id}
                      options={[
                        { value: '', label: 'Select' },
                        ...categories.map(c => ({ value: c.id, label: c.name }))
                      ]}
                      disabled={isSubmitting}
                    />

                    {/* Client */}
                    <Select
                      label="Client (Optional)"
                      value={row.client_id}
                      onChange={(e) => handleFieldChange(row.id, 'client_id', e.target.value)}
                      options={[
                        { value: '', label: 'None' },
                        ...clients.filter(c => c.is_active).map(c => ({ value: c.id, label: c.name }))
                      ]}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Task Title */}
                    <div className="md:col-span-2">
                      <Input
                        label="Task Title"
                        type="text"
                        placeholder="Task title"
                        value={row.task_title}
                        onChange={(e) => handleFieldChange(row.id, 'task_title', e.target.value)}
                        error={rowErrors.task_title}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Start Time */}
                    <Input
                      label="Start (HH:mm)"
                      type="time"
                      value={row.start_time}
                      onChange={(e) => handleFieldChange(row.id, 'start_time', e.target.value)}
                      error={rowErrors.start_time}
                      disabled={isSubmitting}
                    />

                    {/* End Time */}
                    <Input
                      label="End (HH:mm)"
                      type="time"
                      value={row.end_time}
                      onChange={(e) => handleFieldChange(row.id, 'end_time', e.target.value)}
                      error={rowErrors.end_time}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-[1px] text-body-strong">
                        Description
                      </label>
                      <textarea
                        placeholder="Task description"
                        rows={2}
                        value={row.description}
                        onChange={(e) => handleFieldChange(row.id, 'description', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full bg-canvas text-primary-text rounded-md p-3 border border-hairline focus:outline-none focus:border-bmw-blue focus:ring-1 focus:ring-bmw-blue/30 text-sm font-light"
                      />
                    </div>

                    {/* Comment */}
                    <div className="flex flex-col justify-between gap-4">
                      <Input
                        label="Comment (Optional)"
                        type="text"
                        placeholder="Additional comment"
                        value={row.comment}
                        onChange={(e) => handleFieldChange(row.id, 'comment', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Manager Selection Dropdown */}
                  <div>
                    {loadingManagers ? (
                      <div className="text-xs text-muted-text">Loading managers...</div>
                    ) : filteredManagers.length === 0 ? (
                      <p className="text-xs text-m-red">No managers available.</p>
                    ) : (
                      <MultiSelect
                        label="Send to Managers *"
                        selectedValues={row.manager_ids}
                        onChange={(vals) => handleFieldChange(row.id, 'manager_ids', vals)}
                        error={rowErrors.manager_ids}
                        placeholder="Select Managers"
                        options={filteredManagers.map(mgr => ({ value: mgr.id, label: `${mgr.full_name} · ${mgr.email}` }))}
                        disabled={isSubmitting}
                        searchable={true}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-hairline">
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddRow}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          <Plus size={16} className="mr-2" /> Add Another Task
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/timesheet')}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full sm:w-auto"
          >
            Submit All ({rows.length} Row{rows.length !== 1 && 's'})
          </Button>
        </div>
      </div>
    </form>
  );
}
