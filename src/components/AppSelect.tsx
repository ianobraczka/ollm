"use client";

import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type AppSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type AppSelectProps<T extends string | number> = {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: AppSelectOption<T>[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
  width?: "fit" | "full";
};

export function AppSelect<T extends string | number>({
  id,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
  width = "full",
}: AppSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selectedOption?.icon;

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(nextValue: T) {
    setOpen(false);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", width === "fit" ? "w-fit" : "w-full", className)}
    >
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={String(value)}
          required
          onChange={() => {}}
        />
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "app-select-trigger flex w-full cursor-pointer items-center gap-2 rounded-md border border-border/80 bg-background/80 px-3 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,background-color]",
          "hover:border-primary/25 hover:bg-background hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open &&
            "border-primary/30 bg-background shadow-md ring-2 ring-ring/30 ring-offset-1 ring-offset-background",
          triggerClassName,
        )}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        {SelectedIcon && (
          <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{selectedOption?.label}</span>
        <ChevronDown
          className={cn(
            "app-select-chevron h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary/70",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="app-select-menu absolute left-0 top-[calc(100%+0.375rem)] z-50 max-h-60 min-w-full overflow-y-auto rounded-lg border border-border/70 bg-popover/95 p-1 shadow-lg backdrop-blur-md"
        >
          {options.map((option) => {
            const selected = option.value === value;
            const Icon = option.icon;

            return (
              <li key={String(option.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-accent/80 hover:text-accent-foreground",
                  )}
                  onClick={() => selectOption(option.value)}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
