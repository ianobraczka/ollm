"use client";

import type { AppLanguage } from "@/lib/i18n";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

type LanguageSelectProps = {
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
};

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className="flex justify-start rounded-lg bg-background/40 px-3 py-2 text-sm">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AppLanguage)}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
