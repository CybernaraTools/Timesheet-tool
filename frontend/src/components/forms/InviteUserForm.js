import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useInviteManager } from '@/lib/hooks/useUsers';
import Button from '../ui/Button';
import Input from '../ui/Input';

const schema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .refine(val => val.endsWith('@cybernara.com'), {
      message: "Email must end with @cybernara.com"
    }),
});

export default function InviteUserForm({ onSuccess, onCancel }) {
  const inviteManager = useInviteManager();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = (data) => {
    inviteManager.mutate(data.email, {
      onSuccess: () => {
        toast.success(`Invitation link generated and sent to ${data.email}`);
        if (onSuccess) onSuccess();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send invitation");
      }
    });
  };

  const isSubmitting = inviteManager.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Manager's Email Address"
        type="email"
        placeholder="name@cybernara.com"
        error={errors.email?.message}
        {...register('email')}
        disabled={isSubmitting}
      />

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
          Send Invite
        </Button>
      </div>
    </form>
  );
}
