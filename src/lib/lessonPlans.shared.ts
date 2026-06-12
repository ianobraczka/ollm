import type { AppLanguage } from "@/lib/i18n";
import type { Bimestre, LessonPlanCard, LessonPlanSubject } from "@/types/lessonPlans";

export const LESSON_PLAN_GRADES = [5, 6, 7, 8] as const;

/** Display order matches the reference image (7 columns). */
export const LESSON_PLAN_SUBJECTS: LessonPlanSubject[] = [
  "portuguese",
  "math",
  "science",
  "history",
  "geography",
  "english",
  "music",
];

export const PERIOD_LABEL_TO_BIMESTRE: Record<string, Bimestre> = {
  "First Quarter": 1,
  "Second Quarter": 2,
  "Third Quarter": 3,
  "Fourth Quarter": 4,
};

export type SubjectLabelKey =
  | "subjectPortuguese"
  | "subjectMath"
  | "subjectScience"
  | "subjectHistory"
  | "subjectGeography"
  | "subjectEnglish"
  | "subjectMusic";

export type SubjectMeta = {
  icon: "book" | "calculator" | "flask" | "globe" | "map-pin" | "languages" | "music";
  colorClass: string;
  labelKey: SubjectLabelKey;
};

export const SUBJECT_META: Record<LessonPlanSubject, SubjectMeta> = {
  portuguese: { icon: "book", colorClass: "text-sky-400", labelKey: "subjectPortuguese" },
  math: { icon: "calculator", colorClass: "text-blue-400", labelKey: "subjectMath" },
  science: { icon: "flask", colorClass: "text-emerald-400", labelKey: "subjectScience" },
  history: { icon: "globe", colorClass: "text-amber-400", labelKey: "subjectHistory" },
  geography: { icon: "map-pin", colorClass: "text-rose-400", labelKey: "subjectGeography" },
  english: { icon: "languages", colorClass: "text-violet-400", labelKey: "subjectEnglish" },
  music: { icon: "music", colorClass: "text-orange-400", labelKey: "subjectMusic" },
};

/** Maps UI subjects to on-disk plan file slugs (only where files exist today). */
export const SUBJECT_FILE_SLUG: Partial<Record<LessonPlanSubject, string>> = {
  math: "math",
  science: "science",
};

type BimestreDates = { pt: string; en: string };

/** Static bimestre date ranges per grade (placeholder until calendar data exists). */
export const BIMESTRE_DATES: Record<number, Record<Bimestre, BimestreDates>> = {
  5: {
    1: { pt: "12 de fev. - 11 de abr.", en: "Feb 12 - Apr 11" },
    2: { pt: "14 de abr. - 13 de jun.", en: "Apr 14 - Jun 13" },
    3: { pt: "15 de jul. - 12 de set.", en: "Jul 15 - Sep 12" },
    4: { pt: "15 de set. - 12 de dez.", en: "Sep 15 - Dec 12" },
  },
  6: {
    1: { pt: "12 de fev. - 11 de abr.", en: "Feb 12 - Apr 11" },
    2: { pt: "14 de abr. - 13 de jun.", en: "Apr 14 - Jun 13" },
    3: { pt: "15 de jul. - 12 de set.", en: "Jul 15 - Sep 12" },
    4: { pt: "15 de set. - 12 de dez.", en: "Sep 15 - Dec 12" },
  },
  7: {
    1: { pt: "12 de fev. - 11 de abr.", en: "Feb 12 - Apr 11" },
    2: { pt: "14 de abr. - 13 de jun.", en: "Apr 14 - Jun 13" },
    3: { pt: "15 de jul. - 12 de set.", en: "Jul 15 - Sep 12" },
    4: { pt: "15 de set. - 12 de dez.", en: "Sep 15 - Dec 12" },
  },
  8: {
    1: { pt: "12 de fev. - 11 de abr.", en: "Feb 12 - Apr 11" },
    2: { pt: "14 de abr. - 13 de jun.", en: "Apr 14 - Jun 13" },
    3: { pt: "15 de jul. - 12 de set.", en: "Jul 15 - Sep 12" },
    4: { pt: "15 de set. - 12 de dez.", en: "Sep 15 - Dec 12" },
  },
};

export function getBimestreDates(grade: number, bimestre: Bimestre, language: AppLanguage): string {
  const dates = BIMESTRE_DATES[grade]?.[bimestre];
  if (!dates) return "";
  return language === "pt-BR" ? dates.pt : dates.en;
}

export function isValidLessonPlanGrade(grade: number): boolean {
  return (LESSON_PLAN_GRADES as readonly number[]).includes(grade);
}

export function emptyBimestreSubjects(): Record<LessonPlanSubject, LessonPlanCard[]> {
  return {
    portuguese: [],
    math: [],
    science: [],
    history: [],
    geography: [],
    english: [],
    music: [],
  };
}
