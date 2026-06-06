import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function MultiSelect({
  label,
  error,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select...",
  disabled = false,
  searchable,
  openUp = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
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
        setSearch('');
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleOption = (value) => {
    let updated;
    if (selectedValues.includes(value)) {
      updated = selectedValues.filter(val => val !== value);
    } else {
      updated = [...selectedValues, value];
    }
    onChange(updated);
  };

  // Filtered options based on search
  const filteredOptions = options.filter(opt =>
    String(opt.label).toLowerCase().includes(search.toLowerCase())
  );

  // Check if search filter should be visible
  const isSearchable =
    searchable ||
    options.length > 5 ||
    (label && /user|client|category|manager|employee|personnel|member|team/i.test(label));

  // Label to show in the closed select box
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    const selectedLabels = options
      .filter(opt => selectedValues.includes(opt.value))
      .map(opt => String(opt.label).split('·')[0].trim()); // show just the name part

    if (selectedLabels.length <= 2) return selectedLabels.join(', ');
    return `${selectedLabels.length} selected`;
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full gap-2 text-left relative">
      {label && (
        <span className="text-xs font-medium text-body-strong select-none">
          {label}
        </span>
      )}
      
      <div className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full h-12 px-4 py-3 bg-canvas text-primary-text text-base font-light rounded-md
            border border-hairline outline-none transition-all duration-200
            flex items-center justify-between cursor-pointer text-left
            focus:border-[#cc785c] focus:ring-[3px] focus:ring-[#cc785c]/15 focus:outline-none
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-[#c64545] focus:border-[#c64545] focus:ring-[#c64545]/15" : ""}
          `}
        >
          <span className="truncate text-sm">{getDisplayText()}</span>
          <ChevronDown size={16} className={`text-muted-text transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className={`absolute left-0 right-0 z-50 bg-surface-card border border-hairline rounded-md shadow-2xl ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}>
            {/* Search box */}
            {isSearchable && (
              <div className="p-2 border-b border-hairline">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-canvas text-primary-text text-xs px-3 py-2 border border-hairline outline-none focus:border-[#cc785c] placeholder:text-muted-text rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-text">No options found</div>
              ) : (
                filteredOptions.map((option) => {
                  const isChecked = selectedValues.includes(option.value);
                  // Split "Name · email" into two parts if · present
                  const parts = String(option.label).split('·');
                  const mainLabel = parts[0]?.trim() || option.label;
                  const subLabel  = parts[1]?.trim() || null;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleOption(option.value)}
                      className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer
                        ${isChecked ? 'bg-surface-elevated' : 'hover:bg-surface-soft'}`}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className={`text-xs font-medium truncate ${isChecked ? 'text-primary-text' : 'text-body-text'}`}>
                          {mainLabel}
                        </span>
                        {subLabel && (
                          <span className="text-[10px] text-muted-text truncate font-light mt-0.5">{subLabel}</span>
                        )}
                      </span>
                      {isChecked && <Check size={14} className="text-primary-text flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <span className="text-[12px] font-light text-[#c64545] tracking-wide mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
