import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useCreateEntry, useUpdateEntry } from '@/lib/hooks/useTimesheet';
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

// Zod Schema
const entrySchema = z.object({
  work_date: z.string().min(1, "Work date is required").refine(val => {
    const selectedDate = new Date(val);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Work date cannot be in the future" }),
  category_id: z.string().min(1, "Category is required").uuid("Invalid category ID"),
  client_id: z.string().optional().or(z.literal('')),
  task_title: z.string().min(2, "Task title must be at least 2 characters"),
  description: z.string().optional().or(z.literal('')),
  start_time: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be HH:mm format"),
  end_time: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be HH:mm format"),
  output_status: z.enum(['done', 'in_progress', 'blocked', 'deferred']),
  comment: z.string().optional().or(z.literal('')),
  manager_ids: z.array(z.string().uuid()).min(1, "Please select a manager"),
}).refine(data => {
  const [startH, startM] = data.start_time.split(':').map(Number);
  const [endH, endM] = data.end_time.split(':').map(Number);
  const startVal = startH * 60 + startM;
  const endVal = endH * 60 + endM;
  return endVal > startVal;
}, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export default function TimesheetEntryForm({ entry, selectedDate, onSuccess, onCancel }) {
  const { user } = useAuthStore();
  const { data: me } = useMe();
  const { data: clients = [] } = useClients();
  const { data: categories = [] } = useCategories();
  const { data: managers = [], isLoading: loadingManagers } = useManagers();
  const filteredManagers = managers.filter(mgr => mgr.id !== user?.id);

  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const isEdit = !!entry;

  const defaultValues = {
    work_date: entry?.work_date ? entry.work_date.split('T')[0] : (selectedDate || (() => {
      const todayLocal = new Date();
      return `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    })()),
    category_id: entry?.category_id || '',
    client_id: entry?.client_id || '',
    task_title: entry?.task_title || '',
    description: entry?.description || '',
    start_time: entry?.start_time ? entry.start_time.substring(0, 5) : '',
    end_time: entry?.end_time ? entry.end_time.substring(0, 5) : '',
    output_status: entry?.output_status || 'done',
    comment: entry?.comment || '',
    manager_ids: entry?.manager_ids || entry?.entry_managers?.map(m => m.manager_id) || [],
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(entrySchema),
    defaultValues
  });

  const selectedManagerIds = watch('manager_ids') || [];

  // Auto-select manager(s) of the employee by default once loaded (only for new entries)
  useEffect(() => {
    if (!isEdit && me?.manager_ids && me.manager_ids.length > 0) {
      const currentVal = watch('manager_ids');
      if (!currentVal || currentVal.length === 0) {
        setValue('manager_ids', me.manager_ids, { shouldValidate: true });
      }
    }
  }, [me, isEdit, setValue, watch]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      client_id: data.client_id || null, // nullify empty client selections
    };

    if (isEdit) {
      updateEntry.mutate({ id: entry.id, data: payload }, {
        onSuccess: () => {
          toast.success("Timesheet entry updated successfully");
          if (onSuccess) onSuccess();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update entry");
        }
      });
    } else {
      createEntry.mutate(payload, {
        onSuccess: () => {
          toast.success("Timesheet entry created successfully");
          if (onSuccess) onSuccess();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create entry");
        }
      });
    }
  };

  const isSubmitting = createEntry.isPending || updateEntry.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Work Date */}
        <Input
          label="Work Date"
          type="date"
          error={errors.work_date?.message}
          {...register('work_date')}
          disabled={isSubmitting}
        />

        {/* Output Status */}
        <Select
          label="Output Status"
          error={errors.output_status?.message}
          options={[
            { value: 'done', label: 'Done' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'deferred', label: 'Deferred' }
          ]}
          {...register('output_status')}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <Select
          label="Category"
          error={errors.category_id?.message}
          options={[
            { value: '', label: 'Select a category' },
            ...categories.map(c => ({ value: c.id, label: c.name }))
          ]}
          {...register('category_id')}
          disabled={isSubmitting}
        />

        {/* Client (Optional) */}
        <Select
          label="Client (Optional)"
          error={errors.client_id?.message}
          options={[
            { value: '', label: 'None' },
            ...clients.filter(c => c.is_active || c.id === entry?.client_id).map(c => ({ value: c.id, label: c.name }))
          ]}
          {...register('client_id')}
          disabled={isSubmitting}
        />
      </div>

      {/* Task Title */}
      <Input
        label="Task Title"
        type="text"
        placeholder="Enter task title"
        error={errors.task_title?.message}
        {...register('task_title')}
        disabled={isSubmitting}
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-[#e6e4df] select-none leading-none">
          Description
        </label>
        <textarea
          placeholder="Enter detailed description"
          rows={3}
          {...register('description')}
          disabled={isSubmitting}
          className={[
            "w-full rounded-lg px-[14px] py-[10px]",
            "bg-[#1f1e1b] text-[#faf9f5]",
            "text-[15px] font-normal leading-relaxed",
            "placeholder:text-[#6c6a64]",
            "border",
            errors.description
              ? "border-[#c64545] focus:border-[#c64545] focus:ring-[#c64545]/15"
              : "border-[#3c3c3c] focus:border-[#cc785c] focus:ring-[#cc785c]/15",
            "focus:ring-[3px] focus:outline-none",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed resize-none",
          ].join(" ")}
        />
        {errors.description && (
          <p className="text-[12px] text-[#c64545] font-normal leading-snug mt-0.5">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Time */}
        <Input
          label="Start Time (HH:mm)"
          type="time"
          error={errors.start_time?.message}
          {...register('start_time')}
          disabled={isSubmitting}
        />

        {/* End Time */}
        <Input
          label="End Time (HH:mm)"
          type="time"
          error={errors.end_time?.message}
          {...register('end_time')}
          disabled={isSubmitting}
        />
      </div>

      {/* Comment */}
      <Input
        label="Comment (Optional)"
        type="text"
        placeholder="Any additional comments"
        error={errors.comment?.message}
        {...register('comment')}
        disabled={isSubmitting}
      />

      {/* Managers Select Dropdown */}
      <div className="flex flex-col gap-2">
        {loadingManagers ? (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#8e8b82]">
            <Spinner size="sm" variant="muted" />
            Loading managers...
          </div>
        ) : filteredManagers.length === 0 ? (
          <p className="text-[13px] text-[#c64545]">No managers available in the system.</p>
        ) : (
          <MultiSelect
            label="Assign to Managers *"
            selectedValues={selectedManagerIds}
            onChange={(vals) => setValue('manager_ids', vals, { shouldValidate: true })}
            error={errors.manager_ids?.message}
            placeholder="Select Managers"
            options={filteredManagers.map(mgr => ({ value: mgr.id, label: mgr.email }))}
            disabled={isSubmitting}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-5 border-t border-[#3c3c3c]">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-[#a09d96] hover:text-[#faf9f5] hover:bg-[#252320]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          {isEdit ? 'Save changes' : 'Create entry'}
        </Button>
      </div>
    </form>
  );
}
