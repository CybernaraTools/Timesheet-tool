'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useRequestOtp, useVerifyOtp, useCompleteSignup } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { MStripe } from '@/components/layout/Sidebar';

// Zod schemas for different steps
const step1Schema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .refine(val => val.endsWith('@cybernara.com'), {
      message: "Email must end with @cybernara.com"
    }),
});

const step2Schema = z.object({
  code: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Code must contain only digits"),
});

const step3Schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore(state => state.setSession);

  const [step, setStep] = useState(1); // 1, 2, 3
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  // Mutations
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const completeSignup = useCompleteSignup();

  // Forms
  const { register: reg1, handleSubmit: sub1, formState: { errors: err1 } } = useForm({
    resolver: zodResolver(step1Schema)
  });

  const { register: reg2, handleSubmit: sub2, formState: { errors: err2 } } = useForm({
    resolver: zodResolver(step2Schema)
  });

  const { register: reg3, handleSubmit: sub3, formState: { errors: err3 } } = useForm({
    resolver: zodResolver(step3Schema)
  });

  const handleStep1 = (data) => {
    requestOtp.mutate({ email: data.email, purpose: 'signup' }, {
      onSuccess: () => {
        setEmail(data.email);
        toast.success("Verification code dispatched to your corporate inbox");
        setStep(2);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to send code. Please try again.");
      }
    });
  };

  const handleStep2 = (data) => {
    verifyOtp.mutate({ email, code: data.code, purpose: 'signup' }, {
      onSuccess: (res) => {
        if (res?.verificationToken) {
          setVerificationToken(res.verificationToken);
          toast.success("Verification successful");
          setStep(3);
        } else {
          toast.error("Verification failed to return verification token");
        }
      },
      onError: (err) => {
        toast.error(err.message || "Invalid or expired code");
      }
    });
  };

  const handleStep3 = (data) => {
    completeSignup.mutate({
      verificationToken,
      username: data.username,
      password: data.password
    }, {
      onSuccess: (res) => {
        const token = res?.accessToken || res?.session?.access_token;
        const refresh = res?.refreshToken || res?.session?.refresh_token;

        if (token && res?.user) {
          // Store session
          setSession(token, refresh || null, res.user);

          // Write cookies for middleware checks
          if (typeof document !== 'undefined') {
            document.cookie = `timesheet_session=${token}; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `user_role=${res.user.role}; path=/; max-age=86400; SameSite=Lax`;
          }

          toast.success(`Account created successfully! Welcome, ${res.user.full_name || 'user'}`);
          router.replace('/dashboard');
        } else {
          toast.error("Registration succeeded, but failed to log in automatically. Please sign in.");
          router.replace('/login');
        }
      },
      onError: (err) => {
        toast.error(err.message || "Registration failed");
      }
    });
  };

  const isLoading = requestOtp.isPending || verifyOtp.isPending || completeSignup.isPending;

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

        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 border-b border-hairline pb-4">
            <span className={`text-[11px] font-bold uppercase tracking-[1.5px] ${step >= 1 ? 'text-primary-text' : 'text-muted-text'}`}>
              1. Email
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-[1.5px] ${step >= 2 ? 'text-primary-text' : 'text-muted-text'}`}>
              2. Verify
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-[1.5px] ${step >= 3 ? 'text-primary-text' : 'text-muted-text'}`}>
              3. Register
            </span>
          </div>

          {step === 1 && (
            <form onSubmit={sub1(handleStep1)} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@cybernara.com"
                error={err1.email?.message}
                {...reg1('email')}
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
              >
                Send Code
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={sub2(handleStep2)} className="space-y-5">
              <Input
                label="6-Digit Verification Code"
                type="text"
                placeholder="000000"
                maxLength={6}
                error={err2.code?.message}
                {...reg2('code')}
                disabled={isLoading}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
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
                  Verify Code
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={sub3(handleStep3)} className="space-y-5">
              <Input
                label="Username"
                type="text"
                placeholder="Enter unique username"
                error={err3.username?.message}
                {...reg3('username')}
                disabled={isLoading}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                error={err3.password?.message}
                {...reg3('password')}
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-4"
              >
                Create Account
              </Button>
            </form>
          )}

          {/* Signin Redirect Navigation option */}
          <div className="mt-8 pt-6 border-t border-hairline text-center">
            <span className="text-[12px] font-light text-body-text tracking-wide">
              Already have an account?{' '}
            </span>
            <Link
              href="/login"
              className="text-[12px] font-bold text-primary-text uppercase tracking-[1.5px] hover:text-muted-text transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
