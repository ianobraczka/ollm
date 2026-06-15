"use client";

import { BookOpen, GraduationCap, Loader2 } from "lucide-react";
import * as React from "react";

import { AppSelect } from "@/components/AppSelect";
import { LanguageSelect } from "@/components/LanguageSelect";
import { LessonPlanDetailDialog } from "@/components/LessonPlanDetailDialog";
import { LessonPlanSubjectAccordion } from "@/components/LessonPlanSubjectAccordion";
import { ModeToggle } from "@/components/ModeToggle";
import { getErrorMessage } from "@/lib/apiClient";
import {
  LESSON_PLAN_GRADES,
  LESSON_PLAN_SUBJECTS,
  groupCardsBySubjectAndBimestre,
} from "@/lib/lessonPlans.shared";
import { LESSON_MAP_TEXT, UI_TEXT } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/useAppLanguage";
import type { LessonPlanCard, LessonPlanSubject, LessonPlansGradeData } from "@/types/lessonPlans";

export function LessonPlansPage() {
  const [language, setLanguage] = useAppLanguage();
  const [grade, setGrade] = React.useState<number>(5);
  const [data, setData] = React.useState<LessonPlansGradeData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openSubject, setOpenSubject] = React.useState<LessonPlanSubject | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<LessonPlanCard | null>(null);

  const t = LESSON_MAP_TEXT[language];
  const ui = UI_TEXT[language];

  const gradeOptions = LESSON_PLAN_GRADES.map((g) => ({
    value: g,
    label: t.gradeLabel(g),
    icon: GraduationCap,
  }));

  const subjectData = React.useMemo(
    () => (data ? groupCardsBySubjectAndBimestre(data) : null),
    [data],
  );

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/lesson-map?grade=${grade}`);
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, t.loadError));
        }
        const json = (await res.json()) as LessonPlansGradeData;
        if (!cancelled) {
          setData(json);
          setOpenSubject(null);
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-5 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t.pageTitle}</h1>
            <AppSelect
              className="ml-5"
              width="fit"
              aria-label={t.gradeLabel(grade)}
              value={grade}
              onChange={setGrade}
              options={gradeOptions}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelect
              value={language}
              onChange={setLanguage}
              aria-label={ui.language}
            />
            <ModeToggle language={language} />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.loading}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && subjectData && (
          <div className="space-y-3">
            {LESSON_PLAN_SUBJECTS.map((subject) => (
              <LessonPlanSubjectAccordion
                key={subject}
                subject={subject}
                grade={grade}
                quarters={subjectData[subject]}
                language={language}
                isOpen={openSubject === subject}
                onToggle={() =>
                  setOpenSubject((current) => (current === subject ? null : subject))
                }
                onSelectCard={setSelectedCard}
              />
            ))}
          </div>
        )}
      </div>

      <LessonPlanDetailDialog
        card={selectedCard}
        language={language}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
