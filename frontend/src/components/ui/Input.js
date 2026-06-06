import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Input — follows Anthropic design system `text-input` token.
 *
 * Spec:
 *   bg: canvas (#faf9f5)
 *   text: ink (#141413)
 *   border: 1px hairline (#e6dfd8)
 *   rounded: md (8px)
 *   height: 40px  (h-10 → spec says 40px)
 *   padding: 10px × 14px
 *   focus: border → coral (#cc785c), ring → 3px coral/15%
 *   error: border → error (#c64545), ring → error/15%
 */
const Input = React.forwardRef(
  ({ label, error, hint, className = "", type = "text", ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const borderClass = error
      ? "border-[#c64545] focus:border-[#c64545] focus:ring-[#c64545]/15"
      : "border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[#cc785c]/15 dark:border-[#3c3c3c] dark:focus:border-[#cc785c]";

    return (
      <div className="flex flex-col w-full gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[#252523] dark:text-[#e6e4df] select-none leading-none"
          >
            {label}
          </label>
        )}

        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={[
              "w-full h-10 rounded-[8px]",
              "bg-[#faf9f5] dark:bg-[#181715]",
              "text-[#141413] dark:text-[#faf9f5]",
              "text-[15px] font-normal leading-none",
              "placeholder:text-[#8e8b82]",
              isPassword ? "pl-[14px] pr-10" : "px-[14px]",
              "py-[10px]",
              "border",
              borderClass,
              "focus:ring-[3px] focus:outline-none",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
            ].join(" ")}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8b82] hover:text-[#141413] dark:hover:text-[#faf9f5] transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-[#c64545] font-normal leading-snug mt-0.5">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[12px] text-[#8e8b82] font-normal leading-snug mt-0.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
