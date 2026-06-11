"use client";

import { Loader2, Sparkles } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAvailableGrades,
  getSubjectsByGrade,
  PERIOD_OPTIONS,
  SUBJECT_LABELS,
} from "@/lib/curriculumPlans.shared";
import { PLANNING_TEXT, type AppLanguage } from "@/lib/i18n";
import type {
  CurriculumPeriod,
  CurriculumSubject,
  InterdisciplinaryFormValues,
  InterdisciplinaryOutputType,
} from "@/types/curriculum";

const OUTPUT_TYPE_LABEL_KEYS = {
  "lesson-plan": "outputLessonPlan",
  "interdisciplinary-project": "outputInterdisciplinaryProject",
  "learning-sequence": "outputLearningSequence",
} as const satisfies Record<InterdisciplinaryOutputType, keyof typeof PLANNING_TEXT.en>;

type InterdisciplinaryPlanningFormProps = {
  language: AppLanguage;
  isLoading: boolean;
  onSubmit: (values: InterdisciplinaryFormValues) => Promise<void>;
};

const defaultGrade = getAvailableGrades()[0] ?? 5;
const defaultSubjects = getSubjectsByGrade(defaultGrade);

export function InterdisciplinaryPlanningForm({
  language,
  isLoading,
  onSubmit,
}: InterdisciplinaryPlanningFormProps) {
  const t = PLANNING_TEXT[language];

  const [grade, setGrade] = React.useState<number>(defaultGrade);
  const [period, setPeriod] = React.useState<CurriculumPeriod>("first-quarter");
  const [primarySubject, setPrimarySubject] = React.useState<CurriculumSubject>(
    defaultSubjects[0] ?? "math",
  );
  const [secondarySubject, setSecondarySubject] = React.useState<CurriculumSubject | "">("");
  const [outputType, setOutputType] = React.useState<InterdisciplinaryOutputType>("lesson-plan");
  const [teacherGoal, setTeacherGoal] = React.useState("");

  const subjects = getSubjectsByGrade(grade);
  const secondaryOptions = subjects.filter((subject) => subject !== primarySubject);

  React.useEffect(() => {
    if (!subjects.includes(primarySubject)) {
      setPrimarySubject(subjects[0] ?? "math");
    }
  }, [grade, subjects, primarySubject]);

  React.useEffect(() => {
    if (secondarySubject && secondarySubject === primarySubject) {
      setSecondarySubject("");
    }
  }, [primarySubject, secondarySubject]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      grade,
      period,
      primarySubject,
      secondarySubject,
      outputType,
      teacherGoal,
    });
  }

  const selectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          {t.formTitle}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.formDescription}</p>
      </div>

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="grade" className="text-sm font-medium">
              {t.grade} <span className="text-destructive">*</span>
            </label>
            <select
              id="grade"
              required
              className={selectClassName}
              value={grade}
              disabled={isLoading}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              {getAvailableGrades().map((g) => (
                <option key={g} value={g}>
                  {t.gradeLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="period" className="text-sm font-medium">
              {t.period} <span className="text-destructive">*</span>
            </label>
            <select
              id="period"
              required
              className={selectClassName}
              value={period}
              disabled={isLoading}
              onChange={(e) => setPeriod(e.target.value as CurriculumPeriod)}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="primarySubject" className="text-sm font-medium">
              {t.primarySubject} <span className="text-destructive">*</span>
            </label>
            <select
              id="primarySubject"
              required
              className={selectClassName}
              value={primarySubject}
              disabled={isLoading}
              onChange={(e) => setPrimarySubject(e.target.value as CurriculumSubject)}
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {SUBJECT_LABELS[subject]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="secondarySubject" className="text-sm font-medium">
              {t.secondarySubject}
            </label>
            <select
              id="secondarySubject"
              className={selectClassName}
              value={secondarySubject}
              disabled={isLoading}
              onChange={(e) =>
                setSecondarySubject(e.target.value ? (e.target.value as CurriculumSubject) : "")
              }
            >
              <option value="">{t.secondarySubjectAuto}</option>
              {secondaryOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {SUBJECT_LABELS[subject]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t.secondarySubjectHint}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="outputType" className="text-sm font-medium">
            {t.outputType} <span className="text-destructive">*</span>
          </label>
          <select
            id="outputType"
            required
            className={selectClassName}
            value={outputType}
            disabled={isLoading}
            onChange={(e) => setOutputType(e.target.value as InterdisciplinaryOutputType)}
          >
            {(Object.keys(OUTPUT_TYPE_LABEL_KEYS) as InterdisciplinaryOutputType[]).map(
              (value) => (
                <option key={value} value={value}>
                  {t[OUTPUT_TYPE_LABEL_KEYS[value]]}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="teacherGoal" className="text-sm font-medium">
            {t.teacherGoal}
          </label>
          <Textarea
            id="teacherGoal"
            value={teacherGoal}
            disabled={isLoading}
            rows={3}
            placeholder={t.teacherGoalPlaceholder}
            onChange={(e) => setTeacherGoal(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {t.generating}
            </>
          ) : (
            t.generatePlan
          )}
        </Button>
      </form>
    </div>
  );
}
