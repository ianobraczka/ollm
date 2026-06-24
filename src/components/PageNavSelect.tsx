"use client";

import { ClipboardCheck, Layers, MessageSquare } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { AppSelect } from "@/components/AppSelect";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";

const ROUTES = [
  { path: "/", labelKey: "navChat" as const, icon: MessageSquare },
  { path: "/interdisciplinary-planning", labelKey: "navPlanning" as const, icon: Layers },
  { path: "/assessment-assistant", labelKey: "navAssessmentAssistant" as const, icon: ClipboardCheck },
] as const;

type PageNavSelectProps = {
  language: AppLanguage;
};

export function PageNavSelect({ language }: PageNavSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = UI_TEXT[language];

  const currentRoute =
    ROUTES.find((route) => route.path === pathname) ?? ROUTES[0];

  return (
    <AppSelect
      className="page-nav-select"
      triggerClassName="px-2"
      width="fit"
      aria-label={t.navPage}
      value={currentRoute.path}
      onChange={(path) => {
        if (path !== pathname) {
          router.push(path);
        }
      }}
      options={ROUTES.map((route) => ({
        value: route.path,
        label: t[route.labelKey],
        icon: route.icon,
      }))}
    />
  );
}
