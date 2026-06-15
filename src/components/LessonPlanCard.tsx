"use client";

import { FileText } from "lucide-react";
import type { CSSProperties } from "react";

import type { LessonPlanCard as LessonPlanCardType } from "@/types/lessonPlans";

type LessonPlanCardProps = {
  card: LessonPlanCardType;
  onSelect: (card: LessonPlanCardType) => void;
  style?: CSSProperties;
};

export function LessonPlanCard({ card, onSelect, style }: LessonPlanCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      style={style}
      className="group relative w-full rounded-lg border border-border bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-primary/25 hover:bg-accent/50"
    >
      <p className="line-clamp-3 pr-5 text-sm leading-snug text-foreground">{card.title}</p>
      <FileText
        className="absolute bottom-2 right-2 h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground"
        aria-hidden
      />
    </button>
  );
}
