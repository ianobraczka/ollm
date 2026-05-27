"use client";

import { Button } from "@/components/ui/button";
import type { AppLanguage } from "@/lib/i18n";
import { getQuickActions } from "@/lib/quickActions";

type QuickActionsProps = {
  language: AppLanguage;
  disabled?: boolean;
  onSelect: (prompt: string) => void;
};

export function QuickActions({ language, disabled, onSelect }: QuickActionsProps) {
  const actions = getQuickActions(language);

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
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
