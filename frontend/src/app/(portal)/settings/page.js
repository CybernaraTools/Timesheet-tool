'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUpdateCredentials } from '@/lib/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

const settingsSchema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.password && data.password.length < 8) {
    return false;
  }
  return true;
}, {
  message: "Password must be at least 8 characters long",
  path: ["password"]
}).refine(data => {
  if (data.password || data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export default function SettingsPage() {
  const router = useRouter();
  const { user, setSession } = useAuthStore();
  const updateCreds = useUpdateCredentials();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: ''
    }
  });

  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') || 'light';
      setTheme(saved);
    }
  }, []);

  // Pre-fill username when user object hydrates
  useEffect(() => {
    if (user?.username) {
      setValue('username', user.username);
    }
  }, [user, setValue]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('theme-change'));
    }
  };

  const onSubmit = (data) => {
    const payload = {
      username: data.username.trim()
    };

    const isPasswordChanged = !!data.password;

    if (isPasswordChanged) {
      payload.password = data.password;
    }

    updateCreds.mutate(payload, {
      onSuccess: (res) => {
        if (isPasswordChanged) {
          toast.success("Password updated successfully. Please log in with your new password.");
          
          // Clear session cookies and Zustand store
          useAuthStore.getState().clearSession();
          
          // Redirect to login page
          router.replace('/login');
        } else {
          toast.success("Username updated successfully");
          
          // Update Zustand session with new user fields if returned
          if (res?.user && typeof window !== 'undefined') {
            const storedToken = useAuthStore.getState().accessToken;
            const storedRefresh = useAuthStore.getState().refreshToken;
            setSession(storedToken, storedRefresh, res.user);
            
            // Re-sync role cookie just in case
            document.cookie = `user_role=${res.user.role}; path=/; max-age=86400; SameSite=Lax`;
          }
        }

        // Reset password fields
        setValue('password', '');
        setValue('confirmPassword', '');
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update credentials");
      }
    });
  };

  const isPending = updateCreds.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Update your workspace username, theme preferences, and access password."
      />

      <div className="max-w-xl">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="Enter username"
              error={errors.username?.message}
              {...register('username')}
              disabled={isPending}
            />

         

            <div className="pt-4 border-t border-hairline space-y-5">
              <div>
                <h4 className="text-xl font-bold  tracking-[1px] text-body-strong">
                  Change Password
                </h4>
                <p className="text-[11px] font-light text-muted-text mt-0.5">
                  Leave fields blank if you do not want to modify your password.
                </p>
              </div>

              <Input
                label="New Password"
                type="password"
                placeholder="Min 8 characters"
                error={errors.password?.message}
                {...register('password')}
                disabled={isPending}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-hairline">
              <Button
                type="submit"
                variant="primary"
                isLoading={isPending}
                className="w-full sm:w-auto text-xs"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
