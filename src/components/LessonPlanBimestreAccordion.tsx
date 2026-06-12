"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { LessonPlanSubjectColumn } from "@/components/LessonPlanSubjectColumn";
import { getBimestreDates, LESSON_PLAN_SUBJECTS } from "@/lib/lessonPlans.shared";
import { LESSON_PLANS_TEXT, type AppLanguage } from "@/lib/i18n";
import type {
  Bimestre,
  LessonPlanCard,
  LessonPlansBimestreData,
} from "@/types/lessonPlans";

type LessonPlanBimestreAccordionProps = {
  data: LessonPlansBimestreData;
  grade: number;
  language: AppLanguage;
  isOpen: boolean;
  onToggle: () => void;
  onSelectCard: (card: LessonPlanCard) => void;
};

export function LessonPlanBimestreAccordion({
  data,
  grade,
  language,
  isOpen,
  onToggle,
  onSelectCard,
}: LessonPlanBimestreAccordionProps) {
  const t = LESSON_PLANS_TEXT[language];
  const dates = getBimestreDates(grade, data.bimestre as Bimestre, language);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/40"
        aria-expanded={isOpen}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-sm font-semibold text-slate-200">
          {t.bimestreBadge(data.bimestre as Bimestre)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            {t.bimestreLabel(data.bimestre as Bimestre)}
          </p>
          {dates && <p className="text-xs text-slate-500">{dates}</p>}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {LESSON_PLAN_SUBJECTS.map((subject) => (
              <LessonPlanSubjectColumn
                key={subject}
                subject={subject}
                cards={data.subjects[subject]}
                language={language}
                onSelectCard={onSelectCard}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
