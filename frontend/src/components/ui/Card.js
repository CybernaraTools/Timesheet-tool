import React from "react";

/**
 * Card — follows Anthropic design system `feature-card` token.
 *
 * Spec:
 *   bg: surface-card (#efe9de light / #252320 dark)
 *   border: none (color-block only, no shadow)
 *   rounded: lg (12px)
 *   padding: xl (32px)
 *   title: title-md (18px/500) — StyreneB/Inter sans
 *   body: body-md (16px/400)
 */
export default function Card({
  title,
  subtitle,
  children,
  className = "",
  headerActions,
  ...props
}) {
  return (
    <div
      className={[
        "bg-[#efe9de] dark:bg-[#252320]",
        "border border-[#e6dfd8] dark:border-[#3c3c3c]",
        "rounded-xl",          /* rounded-lg = 12px */
        "p-8",                 /* padding xl = 32px */
        "flex flex-col gap-4",
        className,
      ].join(" ")}
      {...props}
    >
      {(title || subtitle || headerActions) && (
        <div className="flex items-start justify-between border-b border-[#e6dfd8] dark:border-[#3c3c3c] pb-4 mb-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {title && (
              <p className="text-[18px] font-medium text-[#141413] dark:text-[#faf9f5] leading-snug">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="text-[13px] text-[#6c6a64] dark:text-[#8e8b82] font-normal leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 ml-4 shrink-0">{headerActions}</div>
          )}
        </div>
      )}
      <div className="text-[15px] font-normal text-[#3d3d3a] dark:text-[#a09d96] leading-relaxed flex-1">
        {children}
      </div>
    </div>
  );
}

/* Sub-components */
Card.Header = function CardHeader({ children, className = "", ...props }) {
  return (
    <div
      className={`flex items-start justify-between border-b border-[#e6dfd8] dark:border-[#3c3c3c] pb-4 mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = "", ...props }) {
  return (
    <p
      className={`text-[18px] font-medium text-[#141413] dark:text-[#faf9f5] leading-snug ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

Card.Description = function CardDescription({ children, className = "", ...props }) {
  return (
    <p
      className={`text-[13px] text-[#6c6a64] dark:text-[#8e8b82] font-normal leading-snug ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

Card.Content = function CardContent({ children, className = "", ...props }) {
  return (
    <div
      className={`text-[15px] font-normal text-[#3d3d3a] dark:text-[#a09d96] leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = "", ...props }) {
  return (
    <div
      className={`border-t border-[#e6dfd8] dark:border-[#3c3c3c] pt-4 mt-2 flex items-center justify-end gap-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
