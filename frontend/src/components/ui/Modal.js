import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal — dialog overlay following the Anthropic design system.
 *
 * Spec treatment: `product-mockup-card-dark` surface (#181715) for the dialog
 * shell, with canvas (#faf9f5) text and hairline (#3c3c3c on dark) borders.
 * Max width ~512px (max-w-lg), max height 90vh, scrollable body.
 * Backdrop: black at 75% opacity + subtle blur.
 * Border radius: rounded-xl (16px) — consistent with `hero-illustration-card`.
 * Close button: `button-icon-circular` (36px, circular, dark elevated bg).
 */
export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const maxWidthMap = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* ── Focus trap + Escape key ─────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    // Focus first input/select/textarea element after mount, fallback to buttons
    const focusTimer = setTimeout(() => {
      let el = modalRef.current?.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (!el) {
        el = modalRef.current?.querySelector(
          'button:not([disabled]), [tabindex="0"]'
        );
      }
      el?.focus();
    }, 60);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        modalRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        ) ?? []
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = saved;
      previousActiveElement.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Portal layer */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog shell — dark product-mockup surface */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={[
          "relative z-10",
          "w-full",
          maxWidthMap[size] ?? maxWidthMap.md,
          "max-h-[88vh] flex flex-col",
          /* Dark surface matching `product-mockup-card-dark` */
          "bg-[#181715] dark:bg-[#181715]",
          "border border-[#3c3c3c]",
          "rounded-2xl",             /* rounded-xl = 16px */
          "shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          "focus:outline-none",
        ].join(" ")}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#3c3c3c] shrink-0">
          {title && (
            /* h2 → gets Cormorant Garamond via global CSS — elegant serif title */
            <h2
              id="modal-title"
              className="text-[22px] text-[#faf9f5] leading-snug pr-4"
              style={{ fontWeight: 400, letterSpacing: "-0.3px" }}
            >
              {title}
            </h2>
          )}

          {/* Close button — `button-icon-circular` spec: 36px, dark elevated bg */}
          <button
            onClick={onClose}
            className={[
              "ml-auto shrink-0",
              "flex items-center justify-center",
              "w-9 h-9 rounded-full",
              "bg-[#252320] text-[#a09d96]",
              "hover:bg-[#2b2925] hover:text-[#faf9f5]",
              "transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cc785c]/40",
            ].join(" ")}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable body — `dark` class forces dark: variants in child components */}
        <div className="dark flex-1 overflow-y-auto px-6 py-5 text-[#a09d96] text-[14px] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
