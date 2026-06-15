"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import { AssistantLoadingIndicator } from "@/components/AssistantLoadingIndicator";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getAvailableGrades,
  getSubjectsByGrade,
  PERIOD_OPTIONS,
  SUBJECT_LABELS,
} from "@/lib/curriculumPlans.shared";
import { FIELD_CONTROL_CLASSNAME } from "@/lib/fieldControlStyles";
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

  const fieldClassName = "space-y-2.5";
  const labelClassName = "block pl-3 text-sm font-medium";

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
          <div className={fieldClassName}>
            <label htmlFor="grade" className={labelClassName}>
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
              triggerClassName={FIELD_CONTROL_CLASSNAME}
            />
          </div>

          <div className={fieldClassName}>
            <label htmlFor="period" className={labelClassName}>
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
              triggerClassName={FIELD_CONTROL_CLASSNAME}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClassName}>
            <label htmlFor="primarySubject" className={labelClassName}>
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
              triggerClassName={FIELD_CONTROL_CLASSNAME}
            />
          </div>

          <div className={fieldClassName}>
            <label htmlFor="secondarySubject" className={labelClassName}>
              {t.secondarySubject}
            </label>
            <AppSelect
              id="secondarySubject"
              disabled={isLoading}
              aria-label={t.secondarySubject}
              value={secondarySubject}
              onChange={setSecondarySubject}
              options={secondarySubjectOptions}
              triggerClassName={FIELD_CONTROL_CLASSNAME}
            />
          </div>
        </div>

        <div className={fieldClassName}>
          <label htmlFor="outputType" className={labelClassName}>
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
            triggerClassName={FIELD_CONTROL_CLASSNAME}
          />
        </div>

        <div className={fieldClassName}>
          <label htmlFor="teacherGoal" className={labelClassName}>
            {t.teacherGoal}
          </label>
          <Textarea
            id="teacherGoal"
            value={teacherGoal}
            disabled={isLoading}
            rows={3}
            placeholder={t.teacherGoalPlaceholder}
            onChange={(e) => setTeacherGoal(e.target.value)}
            className={FIELD_CONTROL_CLASSNAME}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="shrink-0 gap-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <AssistantLoadingIndicator compact className="text-primary-foreground" />
                {t.generating}
              </>
            ) : (
              t.generatePlan
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
