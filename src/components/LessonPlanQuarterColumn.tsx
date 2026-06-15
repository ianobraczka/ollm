"use client";

import { LessonPlanCard } from "@/components/LessonPlanCard";
import {
  LESSON_MAP_SLOT_HEIGHT,
  TOPIC_SLOTS_PER_QUARTER,
  getBimestreDates,
} from "@/lib/lessonPlans.shared";
import { LESSON_MAP_TEXT, type AppLanguage } from "@/lib/i18n";
import type { Bimestre, LessonPlanCard as LessonPlanCardType } from "@/types/lessonPlans";

type LessonPlanQuarterColumnProps = {
  bimestre: Bimestre;
  grade: number;
  cards: LessonPlanCardType[];
  language: AppLanguage;
  onSelectCard: (card: LessonPlanCardType) => void;
};

export function LessonPlanQuarterColumn({
  bimestre,
  grade,
  cards,
  language,
  onSelectCard,
}: LessonPlanQuarterColumnProps) {
  const t = LESSON_MAP_TEXT[language];
  const dates = getBimestreDates(grade, bimestre, language);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-h-10">
        <p className="text-sm font-semibold text-foreground">{t.bimestreLabel(bimestre)}</p>
        {dates && <p className="text-xs text-muted-foreground">{dates}</p>}
      </div>
      <div className="grid grid-rows-4 gap-2">
        {Array.from({ length: TOPIC_SLOTS_PER_QUARTER }, (_, index) => {
          const card = cards[index];

          if (card) {
            return (
              <LessonPlanCard
                key={card.id}
                card={card}
                onSelect={onSelectCard}
                style={{ height: LESSON_MAP_SLOT_HEIGHT }}
              />
            );
          }

          return (
            <div
              key={`${bimestre}-slot-${index}`}
              className="rounded-lg border border-dashed border-border/60 bg-muted/15"
              style={{ height: LESSON_MAP_SLOT_HEIGHT }}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
