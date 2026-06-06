import React from "react";
import Spinner from "./Spinner";

/**
 * Button — follows the Claude/Anthropic design system exactly.
 *
 * Variants:
 *   primary          → coral bg (#cc785c), white text, rounded-md (8px), h-10
 *   secondary        → canvas bg (#faf9f5), ink text, 1px hairline border
 *   ghost            → transparent, ink text, no border — inline/icon context
 *   dark             → surface-dark-elevated bg, on-dark text — for dark surfaces
 *   danger           → error-tinted, red text — destructive actions
 *   text-link        → transparent, no border, coral text — inline link style
 *   icon             → square icon button, secondary style, no px padding
 */
const VARIANTS = {
  primary: [
    "bg-[#cc785c] text-white",
    "hover:bg-[#a9583e]",
    "focus-visible:ring-2 focus-visible:ring-[#cc785c]/40",
    "disabled:bg-[#e6dfd8] disabled:text-[#6c6a64] disabled:cursor-not-allowed",
    "border border-transparent",
    "h-10 px-5",
    "rounded-md",
    "shadow-sm",
  ].join(" "),

  secondary: [
    "bg-canvas text-primary-text",
    "hover:bg-surface-soft",
    "focus-visible:ring-2 focus-visible:ring-[#cc785c]/30",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "border border-hairline",
    "h-10 px-5",
    "rounded-md",
  ].join(" "),

  ghost: [
    "bg-transparent text-primary-text",
    "hover:bg-surface-soft",
    "focus-visible:ring-2 focus-visible:ring-hairline",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "border border-transparent",
    "h-10 px-4",
    "rounded-md",
  ].join(" "),

  // For buttons placed on dark (#181715) surfaces
  dark: [
    "bg-[#252320] text-[#faf9f5]",
    "hover:bg-[#2b2925]",
    "focus-visible:ring-2 focus-visible:ring-[#faf9f5]/20",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "border border-[#3c3c3c]",
    "h-10 px-5",
    "rounded-md",
  ].join(" "),

  danger: [
    "bg-[#c64545]/8 text-[#c64545]",
    "hover:bg-[#c64545]/15",
    "focus-visible:ring-2 focus-visible:ring-[#c64545]/30",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "border border-[#c64545]/25",
    "h-10 px-5",
    "rounded-md",
  ].join(" "),

  "text-link": [
    "bg-transparent text-[#cc785c]",
    "hover:text-[#a9583e]",
    "focus-visible:ring-2 focus-visible:ring-[#cc785c]/30 rounded-sm",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "border-none",
    "h-auto p-0",
    "underline-offset-2 hover:underline",
  ].join(" "),

  // Square icon button — wrap an icon, no text
  icon: [
    "bg-canvas text-primary-text",
    "hover:bg-surface-soft",
    "focus-visible:ring-2 focus-visible:ring-hairline",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "border border-hairline",
    "h-9 w-9 p-0",
    "rounded-md",
    "flex-shrink-0",
  ].join(" "),
};

const BASE =
  "inline-flex items-center justify-center gap-2 " +
  "font-sans text-[14px] font-medium leading-none " +
  "select-none transition-colors duration-150 " +
  "focus-visible:outline-none " +
  "disabled:pointer-events-none";

const Button = React.forwardRef(
  (
    {
      variant = "primary",
      children,
      className = "",
      disabled = false,
      isLoading = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variantClass = VARIANTS[variant] ?? VARIANTS.secondary;

    // White spinner on coral/dark bg; coral spinner on light bg; muted on ghost/danger
    const spinnerVariant =
      variant === "primary" || variant === "dark"
        ? "white"
        : variant === "danger"
        ? "muted"
        : "coral";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${BASE} ${variantClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" variant={spinnerVariant} />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
