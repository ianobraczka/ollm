"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { PageNavSelect } from "@/components/PageNavSelect";
import { APP_NAME } from "@/lib/constants";
import type { AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MobileTopBarProps = {
  language: AppLanguage;
  actions?: ReactNode;
  className?: string;
};

export function MobileTopBar({ language, actions, className }: MobileTopBarProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 lg:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <p className="truncate text-sm font-semibold">{APP_NAME}</p>
      </div>
      <PageNavSelect language={language} className="!ml-0 !max-w-[11rem]" />
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}
