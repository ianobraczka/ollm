"use client";

import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Languages,
  MapPin,
  Music,
} from "lucide-react";

import { LessonPlanCard } from "@/components/LessonPlanCard";
import { SUBJECT_META } from "@/lib/lessonPlans.shared";
import { LESSON_PLANS_TEXT, type AppLanguage } from "@/lib/i18n";
import type { LessonPlanCard as LessonPlanCardType, LessonPlanSubject } from "@/types/lessonPlans";

const ICONS = {
  book: BookOpen,
  calculator: Calculator,
  flask: FlaskConical,
  globe: Globe,
  "map-pin": MapPin,
  languages: Languages,
  music: Music,
} as const;

type LessonPlanSubjectColumnProps = {
  subject: LessonPlanSubject;
  cards: LessonPlanCardType[];
  language: AppLanguage;
  onSelectCard: (card: LessonPlanCardType) => void;
};

export function LessonPlanSubjectColumn({
  subject,
  cards,
  language,
  onSelectCard,
}: LessonPlanSubjectColumnProps) {
  const t = LESSON_PLANS_TEXT[language];
  const meta = SUBJECT_META[subject];
  const Icon = ICONS[meta.icon];

  return (
    <div className="flex min-w-[9.5rem] flex-1 flex-col gap-2">
      <div className={`flex items-center gap-1.5 text-sm font-semibold ${meta.colorClass}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="leading-tight">{t[meta.labelKey]}</span>
      </div>
      <div className="flex flex-col gap-2">
        {cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700/60 px-2 py-4 text-center text-xs text-slate-500">
            {t.emptySubject}
          </p>
        ) : (
          cards.map((card) => (
            <LessonPlanCard key={card.id} card={card} onSelect={onSelectCard} />
          ))
        )}
      </div>
    </div>
  );
}
