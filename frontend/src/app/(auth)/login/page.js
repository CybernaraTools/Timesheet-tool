'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLogin, useRequestOtp, useVerifyOtp } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { MStripe } from '@/components/layout/Sidebar';

// Schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const otpEmailSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .refine(val => val.endsWith('@cybernara.com'), {
      message: 'Email must end with @cybernara.com',
    }),
});

const otpCodeSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
});

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  // Toggle between 'credentials' (Username & Password) and 'otp' (Email & Verification Code)
  const [loginMethod, setLoginMethod] = useState('credentials');
  
  // For Email OTP step tracking: 1 = Enter Email, 2 = Enter Code
  const [otpStep, setOtpStep] = useState(1);
  const [emailForOtp, setEmailForOtp] = useState('');

  // Mutations
  const loginMutation = useLogin();
  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();

  // Inline error states for better UX
  const [loginError, setLoginError] = useState('');
  const [otpError, setOtpError] = useState('');

  // Forms
  const {
    register: registerCreds,
    handleSubmit: handleSubmitCreds,
    formState: { errors: errorsCreds },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: errorsEmail },
  } = useForm({
    resolver: zodResolver(otpEmailSchema),
    defaultValues: { email: '' },
  });

  const {
    register: registerCode,
    handleSubmit: handleSubmitCode,
    formState: { errors: errorsCode },
  } = useForm({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { code: '' },
  });

  // Handle standard credentials login
  const onSubmitCreds = (data) => {
    setLoginError('');
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        const token = res?.accessToken || res?.session?.access_token;
        if (typeof document !== 'undefined' && token && res?.user) {
          document.cookie = `timesheet_session=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `user_role=${res.user.role}; path=/; max-age=86400; SameSite=Lax`;
        }
        toast.success(`Welcome back, ${res?.user?.full_name || 'user'}!`);
        router.replace('/dashboard');
      },
      onError: (err) => {
        if (err.status === 404 || err.code === 'NOT_FOUND' || err.message?.toLowerCase().includes('not found')) {
          setLoginError('No account found with these credentials. Please sign up first.');
        } else if (err.status === 401 || err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('credential')) {
          setLoginError('Incorrect username or password. Please try again.');
        } else {
          setLoginError(err.message || 'Sign in failed. Please try again.');
        }
      },
    });
  };

  // Handle step 1 of OTP (Send Code)
  const onSubmitEmail = (data) => {
    requestOtpMutation.mutate(
      { email: data.email, purpose: 'signin' },
      {
        onSuccess: () => {
          setEmailForOtp(data.email);
          setOtpStep(2);
          toast.success('Verification code sent to your corporate inbox.');
        },
        onError: (err) => {
          if (err.status === 404 || err.code === 'NOT_FOUND' || err.message?.toLowerCase().includes('not found')) {
            toast.error("Account not found with this email. Please Sign Up Now.");
            router.push('/signup');
          } else {
            toast.error(err.message || 'Failed to dispatch verification email.');
          }
        },
      }
    );
  };

  // Handle step 2 of OTP (Verify Code)
  const onSubmitCode = (data) => {
    verifyOtpMutation.mutate(
      { email: emailForOtp, code: data.code, purpose: 'signin' },
      {
        onSuccess: (res) => {
          const token = res?.accessToken || res?.session?.access_token;
          const refresh = res?.refreshToken || res?.session?.refresh_token;

          if (token && res?.user) {
            setSession(token, refresh || null, res.user);

            if (typeof document !== 'undefined') {
              document.cookie = `timesheet_session=${token}; path=/; max-age=86400; SameSite=Lax`;
              document.cookie = `user_role=${res.user.role}; path=/; max-age=86400; SameSite=Lax`;
            }

            toast.success(`Welcome back, ${res.user.full_name || 'user'}!`);
            router.replace('/dashboard');
          } else {
            toast.error('Authentication succeeded, but session data is missing.');
          }
        },
        onError: (err) => {
          if (err.status === 404 || err.code === 'NOT_FOUND' || err.message?.toLowerCase().includes('not found')) {
            toast.error("Account not found. Please Sign Up Now.");
            router.push('/signup');
          } else {
            toast.error(err.message || 'Invalid or expired verification code.');
          }
        },
      }
    );
  };

  const isLoading =
    loginMutation.isPending ||
    requestOtpMutation.isPending ||
    verifyOtpMutation.isPending;

  return (
    <div className="min-h-screen bg-canvas text-primary-text flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-card border border-hairline rounded-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Branding header with M tricolor */}
        <div className="p-8 text-center bg-surface-soft">
          <h2 className="text-3xl font-bold  tracking-[2px] text-primary-text">
            Cybernara
          </h2>
          <p className="text-[10px] uppercase tracking-[1.5px] text-muted-text font-bold mt-1">
            Timesheet Portal
          </p>
        </div>
        <MStripe />

        {/* Tab Selection */}
        <div className="flex border-b border-hairline bg-surface-soft">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setLoginMethod('credentials');
              setOtpStep(1);
            }}
            className={`w-1/2 py-4 text-[11px] font-bold uppercase tracking-[1.5px] text-center border-b-[2px] transition-all rounded-none ${
              loginMethod === 'credentials'
                ? 'border-bmw-blue text-primary-text bg-canvas'
                : 'border-transparent text-muted-text hover:text-primary-text'
            }`}
          >
            Username & Password
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setLoginMethod('otp');
            }}
            className={`w-1/2 py-4 text-[11px] font-bold uppercase tracking-[1.5px] text-center border-b-[2px] transition-all rounded-none ${
              loginMethod === 'otp'
                ? 'border-bmw-blue text-primary-text bg-canvas'
                : 'border-transparent text-muted-text hover:text-primary-text'
            }`}
          >
            Email & Code
          </button>
        </div>

        <div className="p-8">
          {loginMethod === 'credentials' ? (
            /* Method 1: Username / Password */
            <form onSubmit={handleSubmitCreds(onSubmitCreds)} className="space-y-5">
              <Input
                label="Username"
                type="text"
                placeholder="Enter username"
                error={errorsCreds.username?.message}
                {...registerCreds('username')}
                disabled={isLoading}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errorsCreds.password?.message}
                {...registerCreds('password')}
                disabled={isLoading}
              />

              {loginError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-m-red/10 border border-m-red/30 text-m-red text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-4"
              >
                Sign in
              </Button>
            </form>
          ) : (
            /* Method 2: Email & Verification Code (OTP) */
            <div>
              {otpStep === 1 ? (
                /* Step 1: Input Email */
                <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-5">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@cybernara.com"
                    error={errorsEmail.email?.message}
                    {...registerEmail('email')}
                    disabled={isLoading}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full mt-4"
                  >
                    Send Verification Code
                  </Button>
                </form>
              ) : (
                /* Step 2: Input Verification Code */
                <form onSubmit={handleSubmitCode(onSubmitCode)} className="space-y-5">
                  <div className="mb-2 text-sm text-body-text font-light">
                    Sent code to <span className="text-primary-text font-bold">{emailForOtp}</span>
                  </div>

                  <Input
                    label="6-Digit Verification Code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    error={errorsCode.code?.message}
                    {...registerCode('code')}
                    disabled={isLoading}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setOtpStep(1)}
                      disabled={isLoading}
                      className="w-1/3"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isLoading}
                      className="w-2/3"
                    >
                      Verify & Sign In
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Signup Redirect Navigation option */}
          <div className="mt-8 pt-6 border-t border-hairline text-center">
            <span className="text-[12px] font-light text-body-text tracking-wide">
              Don&#39;t have an account?{' '}
            </span>
            <Link
              href="/signup"
              className="text-[12px] font-bold text-primary-text uppercase tracking-[1.5px] hover:text-muted-text transition-colors"
            >
              Sign Up Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
