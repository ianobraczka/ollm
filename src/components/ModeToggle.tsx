"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";

type ModeToggleProps = {
  language: AppLanguage;
};

export function ModeToggle({ language }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = UI_TEXT[language];

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="icon" aria-label={t.toggleTheme} disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={t.toggleTheme}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
