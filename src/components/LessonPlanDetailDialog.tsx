"use client";

import { X } from "lucide-react";
import * as React from "react";

import { SUBJECT_META } from "@/lib/lessonPlans.shared";
import { parseUnitDetail } from "@/lib/parseUnitDetail";
import { LESSON_PLANS_TEXT, type AppLanguage } from "@/lib/i18n";
import type { LessonPlanCard } from "@/types/lessonPlans";

type LessonPlanDetailDialogProps = {
  card: LessonPlanCard | null;
  language: AppLanguage;
  onClose: () => void;
};

export function LessonPlanDetailDialog({ card, language, onClose }: LessonPlanDetailDialogProps) {
  const t = LESSON_PLANS_TEXT[language];

  React.useEffect(() => {
    if (!card) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  const sections = parseUnitDetail(card.rawContent);
  const subjectLabel = t[SUBJECT_META[card.subject].labelKey];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-plan-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label={t.detailClose}
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {subjectLabel} · {card.unitTitle}
            </p>
            <h2 id="lesson-plan-detail-title" className="mt-1 text-lg font-semibold text-slate-100">
              {card.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label={t.detailClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <section key={section.key}>
              <h3 className="text-sm font-semibold text-slate-300">{t[section.titleKey]}</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
