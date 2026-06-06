import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-8 border-b border-hairline">
      <div>
        <h1 className="text-2xl font-bold tracking-[1.5px] text-primary-text">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm font-light text-muted-text">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
