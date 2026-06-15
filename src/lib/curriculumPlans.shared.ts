import type { CurriculumPeriod, CurriculumSubject } from "@/types/curriculum";

const GRADES = [5, 6, 7, 8] as const;

const SUBJECTS: CurriculumSubject[] = [
  "math",
  "science",
  "digital-education",
  "portuguese",
  "english",
  "geography",
  "brazilian-social-studies",
  "world-social-studies",
  "visual-arts",
  "physical-education",
];

export const SUBJECT_LABELS: Record<CurriculumSubject, string> = {
  math: "Mathematics",
  science: "Science",
  "digital-education": "Digital Education",
  portuguese: "Portuguese",
  english: "English",
  geography: "Geography",
  "brazilian-social-studies": "Brazilian Social Studies",
  "world-social-studies": "World Social Studies",
  "visual-arts": "Visual Arts",
  "physical-education": "Physical Education",
};

export const PERIOD_OPTIONS: Array<{
  value: CurriculumPeriod;
  label: string;
  dataLabel: string;
}> = [
  { value: "first-quarter", label: "1st quarter", dataLabel: "First Quarter" },
  { value: "second-quarter", label: "2nd quarter", dataLabel: "Second Quarter" },
  { value: "third-quarter", label: "3rd quarter", dataLabel: "Third Quarter" },
  { value: "fourth-quarter", label: "4th quarter", dataLabel: "Fourth Quarter" },
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
  return PERIOD_OPTIONS.find((option) => option.value === period)?.dataLabel ?? period;
}

export function getPeriodDisplayLabel(period: CurriculumPeriod): string {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;
}

export function getAvailableGrades(): number[] {
  return [...GRADES];
}

export function getSubjectsByGrade(grade: number): CurriculumSubject[] {
  if (!isValidGrade(grade)) return [];
  return [...SUBJECTS];
}
