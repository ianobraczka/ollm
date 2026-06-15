"use client";

import type { AppLanguage } from "@/lib/i18n";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

import { AppSelect } from "@/components/AppSelect";

type LanguageSelectProps = {
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
  "aria-label"?: string;
};

export function LanguageSelect({ value, onChange, "aria-label": ariaLabel }: LanguageSelectProps) {
  return (
    <AppSelect
      width="fit"
      aria-label={ariaLabel ?? "Language"}
      value={value}
      onChange={onChange}
      options={LANGUAGE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
    />
  );
}
