import React from "react";
import { User } from "lucide-react";

export default function Avatar({
  name = "",
  size = "md",
  className = "",
  ...props
}) {
  const getInitials = (str) => {
    if (!str) return "";
    const parts = str.trim().split(/\s+/);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  const sizeClasses = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  }[size] || "w-12 h-12 text-sm";

  return (
    <div
      className={`
        relative inline-flex items-center justify-center rounded-full select-none
        bg-surface-card text-primary-text border border-hairline font-bold
        ${sizeClasses}
        ${className}
      `}
      {...props}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <User className="opacity-60" size={size === "sm" ? 14 : size === "lg" ? 24 : 18} />
      )}
    </div>
  );
}
