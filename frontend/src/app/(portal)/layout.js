'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Spinner from '@/components/ui/Spinner';

export default function PortalLayout({ children }) {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Wait for hydration/mount to read from localStorage securely
  useEffect(() => {
    setIsMounted(true);
    
    // Listen for hydration finish
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }

    return () => {
      unsubFinish();
    };
  }, []);

  useEffect(() => {
    if (isMounted && hasHydrated && !accessToken) {
      // Clear cookies to prevent redirect loops in Next.js middleware
      if (typeof document !== 'undefined') {
        document.cookie = 'timesheet_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
      router.replace('/login');
    }
  }, [isMounted, hasHydrated, accessToken, router]);

  if (!isMounted || !hasHydrated || !accessToken) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="text-sm font-light text-muted-text mt-4 uppercase tracking-[1px]">
          Securing session...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas text-primary-text transition-colors duration-200">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Panel */}
        <Topbar />

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
