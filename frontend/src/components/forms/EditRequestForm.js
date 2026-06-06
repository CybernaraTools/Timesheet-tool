import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useSubmitEditRequest } from '@/lib/hooks/useEditRequests';
import Button from '../ui/Button';

const schema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters long"),
});

export default function EditRequestForm({ entryId, onSuccess, onCancel }) {
  const submitRequest = useSubmitEditRequest();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: ''
    }
  });

  const onSubmit = (data) => {
    submitRequest.mutate({
      entry_id: entryId,
      reason: data.reason
    }, {
      onSuccess: () => {
        toast.success("Edit request submitted successfully");
        if (onSuccess) onSuccess();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to submit request");
      }
    });
  };

  const isSubmitting = submitRequest.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-body-strong">
          Reason for edit *
        </label>
        <textarea
          placeholder="Please explain why this timesheet entry needs editing (minimum 10 characters)"
          rows={4}
          disabled={isSubmitting}
          className={`w-full bg-canvas text-primary-text rounded-md p-3 border ${
            errors.reason ? 'border-m-red' : 'border-hairline'
          } focus:outline-none focus:border-bmw-blue focus:ring-1 focus:ring-bmw-blue/30 text-sm font-light`}
          {...register('reason')}
        />
        {errors.reason && (
          <p className="text-xs text-m-red mt-1">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          Submit Request
        </Button>
      </div>
    </form>
  );
}
