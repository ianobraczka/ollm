"use client";

import * as React from "react";

import { LANGUAGE_STORAGE_KEY, normalizeLanguage, type AppLanguage } from "@/lib/i18n";

function readStoredLanguage(): AppLanguage {
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function useAppLanguage() {
  const [language, setLanguageState] = React.useState<AppLanguage>("en");

  React.useEffect(() => {
    setLanguageState(readStoredLanguage());
  }, []);

  const setLanguage = React.useCallback((next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  return [language, setLanguage] as const;
}
