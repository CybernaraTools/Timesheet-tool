import React from 'react';

// Basic skeleton block with a shimmering pulse effect
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-surface-elevated/40 dark:bg-surface-elevated/20 ${className}`}
      {...props}
    />
  );
}

// Mimics a table loading state
export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`border border-hairline rounded-md overflow-hidden bg-canvas ${className}`}>
      {/* Header Row Placeholder */}
      <div className="bg-surface-soft px-6 py-4 flex gap-4 border-b border-hairline">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 max-w-[150px] bg-surface-card" />
        ))}
      </div>
      {/* Body Rows Placeholder */}
      <div className="divide-y divide-hairline">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-5 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={`h-3.5 flex-1 ${
                  colIndex === 0
                    ? 'max-w-[200px]'
                    : colIndex === cols - 1
                    ? 'max-w-[100px] ml-auto'
                    : 'max-w-[150px]'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mimics a statistics or summary card loader
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`border border-hairline bg-surface-card rounded-md p-6 space-y-4 ${className}`}>
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-8 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Mimics a chart placeholder
export function SkeletonChart({ className = '' }) {
  return (
    <div className={`border border-hairline bg-surface-card rounded-md p-6 space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="h-64 flex items-end gap-3 pt-6 border-b border-l border-hairline pl-4 pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ height: `${20 + (i * 12) % 65}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Default export is the basic Skeleton
export default Skeleton;
