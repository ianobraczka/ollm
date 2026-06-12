"use client";

import { BookOpen, GraduationCap, Lightbulb, Loader2 } from "lucide-react";
import * as React from "react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { LessonPlanBimestreAccordion } from "@/components/LessonPlanBimestreAccordion";
import { LessonPlanDetailDialog } from "@/components/LessonPlanDetailDialog";
import { ModeToggle } from "@/components/ModeToggle";
import { getErrorMessage } from "@/lib/apiClient";
import { LESSON_PLAN_GRADES } from "@/lib/lessonPlans.shared";
import { LESSON_PLANS_TEXT } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/useAppLanguage";
import type { Bimestre, LessonPlanCard, LessonPlansGradeData } from "@/types/lessonPlans";

export function LessonPlansPage() {
  const [language, setLanguage] = useAppLanguage();
  const [grade, setGrade] = React.useState<number>(5);
  const [data, setData] = React.useState<LessonPlansGradeData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openBimestre, setOpenBimestre] = React.useState<Bimestre>(1);
  const [selectedCard, setSelectedCard] = React.useState<LessonPlanCard | null>(null);

  const t = LESSON_PLANS_TEXT[language];

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/lesson-plans?grade=${grade}`);
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, t.loadError));
        }
        const json = (await res.json()) as LessonPlansGradeData;
        if (!cancelled) {
          setData(json);
          setOpenBimestre(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.loadError);
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [grade, t.loadError]);

  return (
    <div className="min-h-screen bg-[#0a0f16] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600/20 text-sky-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{t.pageTitle}</h1>
            </div>
            <p className="max-w-2xl text-sm text-slate-400">{t.pageSubtitle(grade)}</p>

            <div className="relative w-fit">
              <GraduationCap
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <select
                value={grade}
                aria-label={t.gradeLabel(grade)}
                className="lesson-plans-grade-select appearance-none rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-9 text-sm font-medium text-slate-100"
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {LESSON_PLAN_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {t.gradeLabel(g)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelect value={language} onChange={setLanguage} />
            <ModeToggle language={language} />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.loading}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-3">
            {data.bimestres.map((bimestreData) => (
              <LessonPlanBimestreAccordion
                key={bimestreData.bimestre}
                data={bimestreData}
                grade={grade}
                language={language}
                isOpen={openBimestre === bimestreData.bimestre}
                onToggle={() =>
                  setOpenBimestre((current) =>
                    current === bimestreData.bimestre ? current : (bimestreData.bimestre as Bimestre),
                  )
                }
                onSelectCard={setSelectedCard}
              />
            ))}
          </div>
        )}

        <footer className="mt-10 flex items-start gap-2 text-sm text-slate-500">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" aria-hidden />
          <p>{t.footerHint}</p>
        </footer>
      </div>

      <LessonPlanDetailDialog
        card={selectedCard}
        language={language}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
