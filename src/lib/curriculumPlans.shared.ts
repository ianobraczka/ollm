import type { CurriculumPeriod, CurriculumSubject } from "@/types/curriculum";

const GRADES = [5, 6, 7, 8] as const;

const SUBJECTS: CurriculumSubject[] = ["math", "science", "digital-education"];

export const SUBJECT_LABELS: Record<CurriculumSubject, string> = {
  math: "Mathematics",
  science: "Science",
  "digital-education": "Digital Education",
};

export const PERIOD_OPTIONS: Array<{ value: CurriculumPeriod; label: string }> = [
  { value: "first-quarter", label: "First Quarter" },
  { value: "second-quarter", label: "Second Quarter" },
  { value: "third-quarter", label: "Third Quarter" },
  { value: "fourth-quarter", label: "Fourth Quarter" },
];

export function isValidGrade(grade: number): boolean {
  return (GRADES as readonly number[]).includes(grade);
}

export function isValidSubject(subject: string): subject is CurriculumSubject {
  return (SUBJECTS as readonly string[]).includes(subject);
}

export function isValidPeriod(period: string): period is CurriculumPeriod {
  return PERIOD_OPTIONS.some((option) => option.value === period);
}

export function getPeriodLabel(period: CurriculumPeriod): string {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;
}

export function getAvailableGrades(): number[] {
  return [...GRADES];
}

export function getSubjectsByGrade(grade: number): CurriculumSubject[] {
  if (!isValidGrade(grade)) return [];
  return [...SUBJECTS];
}
