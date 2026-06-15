"use client";

import {
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Earth,
  FlaskConical,
  Landmark,
  Languages,
  MapPin,
  Monitor,
  Palette,
} from "lucide-react";

import { LessonPlanQuarterColumn } from "@/components/LessonPlanQuarterColumn";
import { LESSON_PLAN_BIMESTRES, SUBJECT_META } from "@/lib/lessonPlans.shared";
import { LESSON_MAP_TEXT, type AppLanguage } from "@/lib/i18n";
import type { Bimestre, LessonPlanCard, LessonPlanSubject } from "@/types/lessonPlans";

const ICONS = {
  book: BookOpen,
  languages: Languages,
  calculator: Calculator,
  flask: FlaskConical,
  "map-pin": MapPin,
  landmark: Landmark,
  earth: Earth,
  palette: Palette,
  dumbbell: Dumbbell,
  monitor: Monitor,
} as const;

type LessonPlanSubjectAccordionProps = {
  subject: LessonPlanSubject;
  grade: number;
  quarters: Record<Bimestre, LessonPlanCard[]>;
  language: AppLanguage;
  isOpen: boolean;
  onToggle: () => void;
  onSelectCard: (card: LessonPlanCard) => void;
};

export function LessonPlanSubjectAccordion({
  subject,
  grade,
  quarters,
  language,
  isOpen,
  onToggle,
  onSelectCard,
}: LessonPlanSubjectAccordionProps) {
  const t = LESSON_MAP_TEXT[language];
  const meta = SUBJECT_META[subject];
  const Icon = ICONS[meta.icon];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50"
        aria-expanded={isOpen}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary ${meta.colorClass}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{t[meta.labelKey]}</p>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid w-full grid-cols-4 gap-3">
            {LESSON_PLAN_BIMESTRES.map((bimestre) => (
              <LessonPlanQuarterColumn
                key={bimestre}
                bimestre={bimestre}
                grade={grade}
                cards={quarters[bimestre]}
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
