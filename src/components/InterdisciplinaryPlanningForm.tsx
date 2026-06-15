"use client";

import { Loader2, Sparkles } from "lucide-react";
import * as React from "react";

import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
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

  const gradeOptions = getAvailableGrades().map((g) => ({
    value: g,
    label: t.gradeLabel(g),
  }));

  const periodOptions = PERIOD_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const subjectOptions = subjects.map((subject) => ({
    value: subject,
    label: SUBJECT_LABELS[subject],
  }));

  const secondarySubjectOptions: AppSelectOption<CurriculumSubject | "">[] = [
    { value: "", label: t.secondarySubjectAuto },
    ...secondaryOptions.map((subject) => ({
      value: subject,
      label: SUBJECT_LABELS[subject],
    })),
  ];

  const outputTypeOptions = (Object.keys(OUTPUT_TYPE_LABEL_KEYS) as InterdisciplinaryOutputType[]).map(
    (value) => ({
      value,
      label: t[OUTPUT_TYPE_LABEL_KEYS[value]],
    }),
  );

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
            <AppSelect
              id="grade"
              required
              disabled={isLoading}
              aria-label={t.grade}
              value={grade}
              onChange={setGrade}
              options={gradeOptions}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="period" className="text-sm font-medium">
              {t.period} <span className="text-destructive">*</span>
            </label>
            <AppSelect
              id="period"
              required
              disabled={isLoading}
              aria-label={t.period}
              value={period}
              onChange={setPeriod}
              options={periodOptions}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="primarySubject" className="text-sm font-medium">
              {t.primarySubject} <span className="text-destructive">*</span>
            </label>
            <AppSelect
              id="primarySubject"
              required
              disabled={isLoading}
              aria-label={t.primarySubject}
              value={primarySubject}
              onChange={setPrimarySubject}
              options={subjectOptions}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="secondarySubject" className="text-sm font-medium">
              {t.secondarySubject}
            </label>
            <AppSelect
              id="secondarySubject"
              disabled={isLoading}
              aria-label={t.secondarySubject}
              value={secondarySubject}
              onChange={setSecondarySubject}
              options={secondarySubjectOptions}
            />
            <p className="text-xs text-muted-foreground">{t.secondarySubjectHint}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="outputType" className="text-sm font-medium">
            {t.outputType} <span className="text-destructive">*</span>
          </label>
          <AppSelect
            id="outputType"
            required
            disabled={isLoading}
            aria-label={t.outputType}
            value={outputType}
            onChange={setOutputType}
            options={outputTypeOptions}
          />
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
