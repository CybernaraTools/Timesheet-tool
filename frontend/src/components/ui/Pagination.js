import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages || totalPages === 0;

  return (
    <div className={`flex items-center justify-center gap-6 select-none ${className}`}>
      <button
        onClick={() => !isFirstPage && onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-card hover:bg-surface-elevated text-primary-text disabled:pointer-events-none disabled:opacity-30 border border-hairline transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-bmw-blue"
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>

      <span className="text-xs font-bold uppercase tracking-[1.5px] text-body-strong">
        PAGE {currentPage} OF {totalPages || 1}
      </span>

      <button
        onClick={() => !isLastPage && onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-card hover:bg-surface-elevated text-primary-text disabled:pointer-events-none disabled:opacity-30 border border-hairline transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-bmw-blue"
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
