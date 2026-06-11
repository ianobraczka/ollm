"use client";

import * as React from "react";

import { LANGUAGE_STORAGE_KEY, normalizeLanguage, type AppLanguage } from "@/lib/i18n";

function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function useAppLanguage() {
  const [language, setLanguage] = React.useState<AppLanguage>(readStoredLanguage);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setLanguage(readStoredLanguage());
      return;
    }
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return [language, setLanguage] as const;
}
