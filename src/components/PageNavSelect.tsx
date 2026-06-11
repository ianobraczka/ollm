"use client";

import { usePathname, useRouter } from "next/navigation";

import { UI_TEXT, type AppLanguage } from "@/lib/i18n";

const ROUTES = [
  { path: "/", labelKey: "navChat" as const },
  { path: "/interdisciplinary-planning", labelKey: "navPlanning" as const },
];

type PageNavSelectProps = {
  language: AppLanguage;
};

export function PageNavSelect({ language }: PageNavSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = UI_TEXT[language];

  const current =
    ROUTES.find((route) => route.path === pathname)?.path ?? ROUTES[0].path;

  return (
    <select
      value={current}
      aria-label={t.navPage}
      className="page-nav-select w-fit rounded-md border border-border bg-background px-2 py-2.5 text-sm"
      onChange={(e) => router.push(e.target.value)}
    >
      {ROUTES.map((route) => (
        <option key={route.path} value={route.path}>
          {t[route.labelKey]}
        </option>
      ))}
    </select>
  );
}
