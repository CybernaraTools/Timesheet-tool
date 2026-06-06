import React from "react";

/**
 * Spinner — ring-style loading indicator.
 * Variants:
 *   white   → white ring (on coral/dark backgrounds)
 *   coral   → coral ring (on canvas/light backgrounds)
 *   muted   → warm-gray ring (on card surfaces)
 */
export default function Spinner({ size = "md", variant = "coral", className = "" }) {
  const sizeMap = {
    xs: "w-3 h-3 border-[1.5px]",
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-[3px]",
    xl: "w-12 h-12 border-4",
  };

  const variantMap = {
    white: "border-white/25 border-t-white",
    coral: "border-[#cc785c]/25 border-t-[#cc785c]",
    muted: "border-[#e6dfd8] border-t-[#6c6a64]",
    "on-dark": "border-[#faf9f5]/20 border-t-[#faf9f5]",
  };

  return (
    <span
      className={[
        "animate-spin rounded-full inline-block shrink-0",
        sizeMap[size] ?? sizeMap.md,
        variantMap[variant] ?? variantMap.coral,
        className,
      ].join(" ")}
      role="status"
      aria-label="Loading"
    />
  );
}
