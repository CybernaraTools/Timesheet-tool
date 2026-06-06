import React from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-10 
        bg-surface-soft border border-hairline rounded-md
        min-h-[300px] w-full ${className}
      `}
    >
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 bg-surface-card border border-hairline rounded-md mb-6 text-muted-text">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}

      {title && (
        <h3 className="text-base font-bold  tracking-[1.5px] text-primary-text">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-sm font-light text-body-text mt-2 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
