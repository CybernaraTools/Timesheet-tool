import React from "react";

/**
 * Badge — follows Anthropic design system badge tokens exactly.
 *
 * Variants (spec):
 *   pill         → badge-pill:  surface-card bg, ink text, rounded-pill
 *   coral        → badge-coral: coral bg, white text, uppercase caption, rounded-pill
 *   success      → semantic green — status indicators
 *   warning      → semantic amber
 *   error/danger → semantic red
 *   info         → teal accent (#5db8a6) — spec uses teal, not blue
 *   muted        → neutral warm gray
 */
const VARIANTS = {
  // Spec `badge-pill` — content tags, model names, etc.
  pill: "bg-[#efe9de] text-[#141413] border-transparent",
  // Spec `badge-coral` — NEW, BETA, featured highlights — uppercase caption
  coral: "bg-[#cc785c] text-white border-transparent uppercase tracking-[1.5px]",
  // Semantic states
  success: "bg-[#5db872]/12 text-[#5db872] border-[#5db872]/25",
  warning: "bg-[#d4a017]/12 text-[#d4a017] border-[#d4a017]/25",
  danger:  "bg-[#c64545]/10 text-[#c64545] border-[#c64545]/25",
  error:   "bg-[#c64545]/10 text-[#c64545] border-[#c64545]/25",
  // Teal accent — spec uses #5db8a6, not blue
  info:    "bg-[#5db8a6]/12 text-[#5db8a6] border-[#5db8a6]/25",
  // Neutral warm muted
  muted:   "bg-[#6c6a64]/10 text-[#6c6a64] border-[#6c6a64]/20",
};

export default function Badge({
  variant = "muted",
  children,
  className = "",
  ...props
}) {
  const color = VARIANTS[variant] ?? VARIANTS.muted;

  return (
    <span
      className={[
        "inline-flex items-center",
        "px-2.5 py-[3px]",
        "text-[11px] font-medium leading-none",
        "rounded-full border",
        "select-none whitespace-nowrap",
        color,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
