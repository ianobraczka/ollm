"use client";

import { FileText } from "lucide-react";

import type { LessonPlanCard as LessonPlanCardType } from "@/types/lessonPlans";

type LessonPlanCardProps = {
  card: LessonPlanCardType;
  onSelect: (card: LessonPlanCardType) => void;
};

export function LessonPlanCard({ card, onSelect }: LessonPlanCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      className="group relative w-full rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-3 text-left transition-colors hover:border-slate-600 hover:bg-slate-800"
    >
      <p className="pr-6 text-sm leading-snug text-slate-100">{card.title}</p>
      <FileText
        className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400"
        aria-hidden
      />
    </button>
  );
}
