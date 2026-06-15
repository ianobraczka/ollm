"use client";

import { Send } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { FIELD_CONTROL_CLASSNAME } from "@/lib/fieldControlStyles";
import { cn } from "@/lib/utils";

const MAX_HEIGHT_PX = 208;

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  sendLabel: string;
  sendingLabel: string;
  className?: string;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  isLoading = false,
  sendLabel,
  sendingLabel,
  className,
}: ChatComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || isLoading || !value.trim()) return;
    await onSubmit();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={className}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl p-2 transition-[box-shadow,border-color,background-color]",
          FIELD_CONTROL_CLASSNAME,
          "focus-within:ring-2 focus-within:ring-primary/25 focus-within:ring-offset-1 focus-within:ring-offset-background",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="max-h-52 min-h-10 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-sm leading-6 shadow-none focus-visible:outline-none focus-visible:ring-0"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          className="mb-0.5 shrink-0"
          disabled={disabled || isLoading || !value.trim()}
        >
          <Send className="h-4 w-4" />
          {isLoading ? sendingLabel : sendLabel}
        </Button>
      </div>
    </form>
  );
}
