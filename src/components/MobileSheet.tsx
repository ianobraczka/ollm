"use client";

import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children: React.ReactNode;
  /** Keep children mounted while closed (preserves state like chat history). */
  keepMounted?: boolean;
  /** Override the default scrollable padded body wrapper. */
  bodyClassName?: string;
  /** Override the sliding panel width/position classes. */
  panelClassName?: string;
};

export function MobileSheet({
  open,
  onClose,
  title,
  side = "left",
  children,
  keepMounted = false,
  bodyClassName,
  panelClassName,
}: MobileSheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  if (!open && !keepMounted) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-50 lg:hidden", !open && "hidden")}
      role="dialog"
      aria-modal={open}
      aria-label={title}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 flex w-[min(100%,22rem)] flex-col bg-background shadow-xl",
          side === "left" ? "left-0 border-r border-border" : "right-0 border-l border-border",
          panelClassName,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{title}</p>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain p-4",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
