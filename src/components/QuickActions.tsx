"use client";

import { Button } from "@/components/ui/button";
import { QUICK_ACTIONS } from "@/lib/quickActions";

type QuickActionsProps = {
  disabled?: boolean;
  onSelect: (prompt: string) => void;
};

export function QuickActions({ disabled, onSelect }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(action.prompt)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
