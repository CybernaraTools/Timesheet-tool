import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead
} from '@/lib/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/utils/formatDate';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Poll for unread notifications every 30 seconds (handled by react-query config in useNotifications)
  const { data: notificationsData, isLoading } = useNotifications({
    is_read: false,
    limit: 10
  });

  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.pagination?.total || 0;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        setIsOpen(false);
      }
    });
  };

  const handleItemClick = (id) => {
    markAsRead.mutate(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-muted-text hover:text-primary-text transition-colors duration-150 rounded-none focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-m-red text-[9px] font-bold text-white rounded-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-[-120px] sm:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-card border border-hairline rounded-md shadow-2xl z-50">
          <div className="flex items-center justify-between p-4 border-b border-hairline">
            <h3 className="text-sm font-bold tracking-[1px] text-primary-text">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllAsRead.isPending}
                className="text-[10px] font-semibold  text-bmw-blue hover:text-primary-text transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-hairline">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-text font-light">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-text font-light">
                No new notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n.id)}
                  className="p-4 hover:bg-surface-soft cursor-pointer transition-colors duration-150"
                >
                  <p className="text-sm text-primary-text  mb-1">
                    {n.title}
                  </p>
                  <p className="text-xs font-normal text-body-text mb-1 leading-normal">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-muted-text font-normal">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-hairline text-center bg-surface-soft">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-block text-[10px] font-bold   text-primary-text hover:text-muted-text transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
