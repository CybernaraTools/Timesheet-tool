'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead
} from '@/lib/hooks/useNotifications';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { Bell, Check, CheckSquare } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatDate';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Queries
  const { data: notificationsData, isLoading, refetch } = useNotifications({
    page,
    limit
  });

  const notifications = notificationsData?.data || [];
  const pagination = notificationsData?.pagination || { page: 1, totalPages: 1 };
  const hasUnread = notifications.some(n => !n.is_read);

  // Mutations
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleMarkAllRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to mark notifications as read");
      }
    });
  };

  const handleItemClick = (notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
  };

  const actions = hasUnread && (
    <Button
      variant="secondary"
      onClick={handleMarkAllRead}
      isLoading={markAllAsRead.isPending}
      className="text-xs  h-10"
    >
      <CheckSquare size={14} className=" inline" /> Mark All Read
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with system triggers, timesheet locks, and edit request approvals."
        actions={actions}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications Logged"
          description="Your inbox is currently clear of any alerts or requests."
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`border p-6 rounded-md transition-all duration-150 relative ${
                  n.is_read
                    ? 'bg-surface-card/60 border-hairline/60 opacity-60'
                    : 'bg-surface-card border-hairline cursor-pointer hover:border-bmw-blue/50 border-l-[3px] border-l-bmw-blue'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${n.is_read ? 'text-muted-text' : 'text-primary-text'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <Badge variant="info">New</Badge>
                      )}
                    </div>
                    <p className={`text-xs font-normal leading-relaxed ${n.is_read ? 'text-muted-text' : 'text-body-text'}`}>
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted-text font-normal">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(n);
                      }}
                      disabled={markAsRead.isPending}
                      className="p-1.5 bg-canvas border border-hairline hover:border-bmw-blue text-muted-text hover:text-primary-text transition-colors rounded-sm"
                      title="Mark read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
