"use client";

import { Brain, Map } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";

type LessonMapLinkProps = {
  language: AppLanguage;
};

export function LessonMapLink({ language }: LessonMapLinkProps) {
  const pathname = usePathname();
  const t = UI_TEXT[language];
  const onLessonMap = pathname === "/lesson-map";

  const href = onLessonMap ? "/" : "/lesson-map";
  const label = onLessonMap ? t.navChat : t.navLessonMap;
  const Icon = onLessonMap ? Brain : Map;

  return (
    <Button asChild variant="outline" size="icon">
      <Link href={href} aria-label={label}>
        <Icon className="h-4 w-4" />
      </Link>
    </Button>
  );
}
