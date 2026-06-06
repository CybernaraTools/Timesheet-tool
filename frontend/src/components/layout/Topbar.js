import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUiStore } from '@/lib/stores/uiStore';
import NotificationBell from '../notifications/NotificationBell';
import Avatar from '../ui/Avatar';

export default function Topbar() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const { toggleSidebar } = useUiStore();
  
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem('theme') || 'light';
      setTheme(saved);
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    syncTheme();

    if (typeof window !== 'undefined') {
      window.addEventListener('theme-change', syncTheme);
      return () => window.removeEventListener('theme-change', syncTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('theme-change'));
    }
  };

  const handleLogout = () => {
    // Clear Zustand store
    clearSession();

    // Clear authentication cookies
    if (typeof document !== 'undefined') {
      document.cookie = 'timesheet_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    // Redirect to login page
    router.push('/login');
  };

  return (
    <header className="h-16 w-full bg-canvas border-b border-hairline flex items-center justify-between px-6 sticky top-0 z-40 transition-colors duration-200">
      {/* Left section: mobile toggle & title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 text-muted-text hover:text-primary-text transition-colors duration-150"
        >
          <Menu size={20} />
        </button>
        
      </div>

      {/* Right section: profile, notifications, logout */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 text-muted-text hover:text-primary-text transition-colors duration-150 rounded-none focus:outline-none border border-transparent"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info */}
        <div className="flex items-center gap-3 border-l border-hairline pl-4 h-8">
          <Avatar name={user?.full_name || 'User'} size="sm" />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-primary-text leading-tight">
              {user?.full_name || 'Loading...'}
            </p>
            <p className="text-[10px] text-muted-text font-light leading-none capitalize mt-0.5">
              {user?.role || 'User'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-muted-text hover:text-[#c64545] hover:bg-[#c64545]/10 transition-colors duration-150 rounded-[6px] focus:outline-none ml-2 border border-transparent hover:border-[#c64545]/20 cursor-pointer"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
