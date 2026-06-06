'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUiStore } from '@/lib/stores/uiStore';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  FileEdit,
  Users,
  UserCog,
  Briefcase,
  Tag,
  BarChart3,
  Shield,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// M-signature tricolor stripe divider
export function MStripe() {
  return (
    <div className="h-[2px] w-full bg-[#cc785c]" />
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUiStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = user?.role || 'employee';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['employee', 'manager', 'admin'], icon: LayoutDashboard },
    { name: 'My Timesheet', path: '/timesheet', roles: ['employee', 'manager', 'admin'], icon: Calendar },
    { name: 'Edit Requests', path: '/edit-requests', roles: ['employee', 'manager'], icon: FileEdit },
    { name: 'Team', path: '/team', roles: ['manager', 'admin'], icon: Users },
    { name: 'Users', path: '/users', roles: ['admin'], icon: UserCog },
    { name: 'Clients', path: '/clients', roles: ['manager', 'admin'], icon: Briefcase },
    { name: 'Categories', path: '/categories', roles: ['manager', 'admin'], icon: Tag },
    { name: 'Reports', path: '/reports', roles: ['manager', 'admin'], icon: BarChart3 },
    { name: 'Settings', path: '/settings', roles: ['employee', 'manager', 'admin'], icon: Settings },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(role));

  const sidebarContent = (
    <div className="h-full flex flex-col bg-canvas border-r border-hairline transition-all duration-300">
      {/* Brand Header */}
      <div className={`flex items-center justify-between border-b border-hairline transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-5'}`}>
        {!isCollapsed && (
          <Link href="/dashboard" className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-primary-text">Cybernara</span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-muted-text font-semibold">Timesheet Portal</span>
          </Link>
        )}

        {/* Mobile close / Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-muted-text hover:text-primary-text hover:bg-surface-card transition-colors duration-150 ml-auto"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <button
          onClick={toggleSidebar}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-text hover:text-primary-text hover:bg-surface-card transition-colors duration-150"
        >
          <X size={16} />
        </button>
      </div>

      {/* M tricolor divider */}
      <MStripe />

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          const label = item.name === 'My Timesheet' && role === 'admin' ? 'Timesheets' : item.name;

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
                if (isSidebarOpen) toggleSidebar();
              }}
              title={isCollapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 rounded-md ${
                isActive
                  ? 'bg-surface-card text-primary-text font-medium border-l-2 border-[#cc785c]'
                  : 'text-muted-text hover:bg-surface-soft hover:text-primary-text border-l-2 border-transparent'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className={isActive ? 'text-[#cc785c] shrink-0' : 'text-muted-text shrink-0'} />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-hairline bg-surface-soft">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-card flex items-center justify-center font-bold text-sm border border-hairline text-primary-text shrink-0">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-text truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[10px] text-muted-text capitalize truncate font-light">
                {role}
              </p>
            </div>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="p-3 border-t border-hairline flex justify-center">
          <div className="w-8 h-8 rounded-full bg-surface-card flex items-center justify-center font-bold text-sm border border-hairline text-primary-text">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block h-screen sticky top-0 shrink-0 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible only when isSidebarOpen is true) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          {/* Menu Drawer */}
          <div className="relative w-60 max-w-xs h-full flex-col z-10 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
