import type { InterdisciplinaryFormValues } from "@/types/curriculum";
import {
  PERIOD_OPTIONS,
  SUBJECT_LABELS,
} from "@/lib/curriculumPlans.shared";
import { PLANNING_TEXT, type AppLanguage } from "@/lib/i18n";
import type { InterdisciplinaryOutputType } from "@/types/curriculum";

const OUTPUT_TYPE_LABEL_KEYS = {
  "lesson-plan": "outputLessonPlan",
  "interdisciplinary-project": "outputInterdisciplinaryProject",
  "learning-sequence": "outputLearningSequence",
} as const satisfies Record<InterdisciplinaryOutputType, keyof typeof PLANNING_TEXT.en>;

export function formatPlanSettingsUserMessage(
  values: InterdisciplinaryFormValues,
  language: AppLanguage,
): string {
  const t = PLANNING_TEXT[language];
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === values.period)?.label ?? values.period;

  const lines = [
    `${t.grade}: ${t.gradeLabel(values.grade)}`,
    `${t.period}: ${periodLabel}`,
    `${t.primarySubject}: ${SUBJECT_LABELS[values.primarySubject]}`,
    values.secondarySubject
      ? `${t.secondarySubject}: ${SUBJECT_LABELS[values.secondarySubject]}`
      : `${t.secondarySubject}: ${t.secondarySubjectAuto}`,
    `${t.outputType}: ${t[OUTPUT_TYPE_LABEL_KEYS[values.outputType]]}`,
  ];

  if (values.teacherGoal.trim()) {
    lines.push(`${t.teacherGoal}: ${values.teacherGoal.trim()}`);
  }

  return lines.join("\n");
}
