import React, { useId, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Custom Searchable Select — matches MultiSelect UI but selects a single value.
 * Supports standard react-hook-form integration via hidden select and ref forwarding.
 */
const Select = React.forwardRef(
  (
    {
      label,
      error,
      hint,
      options = [],
      className = "",
      children,
      value,
      onChange,
      name,
      searchable,
      disabled = false,
      placeholder = "Select...",
      openUp = false,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = props.id || generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);
    const hiddenSelectRef = useRef(null);
    const triggerRef = useRef(null);

    // Merge forwarded ref and local ref for the hidden select
    const setRefs = React.useCallback(
      (node) => {
        hiddenSelectRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    // Parse children options if passed instead of options array
    let finalOptions = [...options];
    if (children && finalOptions.length === 0) {
      React.Children.forEach(children, (child) => {
        if (child && child.type === "option") {
          finalOptions.push({
            value: child.props.value ?? "",
            label: child.props.children ?? "",
          });
        }
      });
    }

    // Close dropdown on click outside
    useEffect(() => {
      function handleClickOutside(event) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target)
        ) {
          setIsOpen(false);
          setSearch("");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close on Escape key
    useEffect(() => {
      function handleKeyDown(event) {
        if (event.key === "Escape") {
          setIsOpen(false);
          setSearch("");
        }
      }
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Filter options based on search query
    const filteredOptions = finalOptions.filter((opt) =>
      String(opt.label).toLowerCase().includes(search.toLowerCase())
    );

    // Check if dropdown should be searchable
    const isSearchable =
      searchable ||
      finalOptions.length > 5 ||
      (label &&
        /user|client|category|manager|employee|personnel|member/i.test(label));

    // Handle selection
    const handleSelectOption = (selectedValue) => {
      // 1. Call standard onChange prop if defined
      if (onChange) {
        onChange({
          target: {
            name: name || "",
            value: selectedValue,
          },
        });
      }

      // 2. Programmatically update hidden native select value and trigger change event
      if (hiddenSelectRef.current) {
        const selectEl = hiddenSelectRef.current;
        selectEl.value = selectedValue;

        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          "value"
        )?.set;

        if (nativeValueSetter) {
          nativeValueSetter.call(selectEl, selectedValue);
        }

        const event = new Event("change", { bubbles: true });
        selectEl.dispatchEvent(event);
      }

      setIsOpen(false);
      setSearch("");
      triggerRef.current?.focus();
    };

    const currentValue = value !== undefined ? value : "";

    // Find the currently selected option
    const selectedOption =
      finalOptions.find((opt) => String(opt.value) === String(currentValue)) ||
      (currentValue === "" ? finalOptions[0] : null);

    // Label to show in the closed trigger box (splits '·' if present to look neat)
    const getDisplayText = () => {
      if (!selectedOption) return placeholder;
      return String(selectedOption.label).split("·")[0].trim();
    };

    const borderClass = error
      ? "border-[#c64545] focus:border-[#c64545] focus:ring-[#c64545]/15"
      : "border-[#e6dfd8] focus:border-[#cc785c] focus:ring-[#cc785c]/15 dark:border-[#3c3c3c] dark:focus:border-[#cc785c]";

    return (
      <div
        ref={containerRef}
        className="flex flex-col w-full gap-1.5 text-left relative"
      >
        {label && (
          <label
            htmlFor={selectId}
            className="text-[13px] font-medium text-[#252523] dark:text-[#e6e4df] select-none leading-none"
          >
            {label}
          </label>
        )}

        <div className="relative w-full">
          {/* Custom Visual Button Trigger */}
          <button
            ref={triggerRef}
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={[
              "w-full h-10 rounded-[8px]",
              "bg-[#faf9f5] dark:bg-[#181715]",
              "text-[#141413] dark:text-[#faf9f5]",
              "text-[15px] font-normal leading-none",
              "pl-[14px] pr-10",
              "border",
              borderClass,
              "focus:ring-[3px] focus:outline-none",
              "flex items-center justify-between cursor-pointer text-left",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className,
            ].join(" ")}
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown
              size={15}
              className={[
                "text-[#6c6a64] transition-transform duration-200",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {/* Hidden native select for standard HTML forms and react-hook-form bindings */}
          <select
            ref={setRefs}
            name={name}
            value={currentValue}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            tabIndex={-1}
            {...props}
          >
            {finalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className={[
              "absolute left-0 right-0 z-50 bg-[#faf9f5] dark:bg-[#181715] border border-[#e6dfd8] dark:border-[#3c3c3c] rounded-[8px] shadow-2xl",
              openUp ? "bottom-full mb-1" : "top-full mt-1"
            ].join(" ")}>
              {/* Search filter input */}
              {isSearchable && (
                <div className="p-2 border-b border-[#e6dfd8] dark:border-[#3c3c3c]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-[#faf9f5] dark:bg-[#181715] text-[#141413] dark:text-[#faf9f5] text-xs px-3 py-2 border border-[#e6dfd8] dark:border-[#3c3c3c] outline-none focus:border-[#cc785c] placeholder:text-[#8e8b82] rounded-[4px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Options list */}
              <div className="max-h-56 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#8e8b82]">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected =
                      String(option.value) === String(currentValue);
                    const parts = String(option.label).split("·");
                    const mainLabel = parts[0]?.trim() || option.label;
                    const subLabel = parts[1]?.trim() || null;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectOption(option.value)}
                        className={[
                          "w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer",
                          isSelected
                            ? "bg-[#efe9de] dark:bg-[#252320]"
                            : "hover:bg-[#f5f0e8]/50 dark:hover:bg-[#252320]/50",
                        ].join(" ")}
                      >
                        <span className="flex flex-col min-w-0">
                          <span
                            className={[
                              "text-xs font-medium truncate",
                              isSelected
                                ? "text-[#141413] dark:text-[#faf9f5]"
                                : "text-[#3d3d3a] dark:text-[#a09d96]",
                            ].join(" ")}
                          >
                            {mainLabel}
                          </span>
                          {subLabel && (
                            <span className="text-[10px] text-[#8e8b82] truncate font-light mt-0.5">
                              {subLabel}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check
                            size={14}
                            className="text-[#cc785c] flex-shrink-0"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
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

Select.displayName = "Select";
export default Select;
