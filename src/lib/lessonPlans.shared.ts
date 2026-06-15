import type { AppLanguage } from "@/lib/i18n";
import type { Bimestre, LessonPlanCard, LessonPlanSubject } from "@/types/lessonPlans";

export const LESSON_PLAN_GRADES = [5, 6, 7, 8] as const;

/** Fixed topic slots shown per subject column in each bimestre grid. */
export const TOPIC_SLOTS_PER_QUARTER = 4;

/** Maximum topics parsed from plan files per quarter unit. */
export const TOPICS_PER_QUARTER_MAX = 4;

/** Layout dimensions for the lesson map topic grid. */
export const LESSON_MAP_SLOT_HEIGHT = "5.5rem";

export const LESSON_PLAN_BIMESTRES = [1, 2, 3, 4] as const satisfies readonly Bimestre[];

export const LESSON_PLAN_SUBJECTS: LessonPlanSubject[] = [
  "portuguese",
  "english",
  "math",
  "science",
  "geography",
  "brazilian-social-studies",
  "world-social-studies",
  "visual-arts",
  "physical-education",
  "digital-education",
];

export const PERIOD_LABEL_TO_BIMESTRE: Record<string, Bimestre> = {
  "First Quarter": 1,
  "Second Quarter": 2,
  "Third Quarter": 3,
  "Fourth Quarter": 4,
};

export type SubjectLabelKey =
  | "subjectPortuguese"
  | "subjectEnglish"
  | "subjectMath"
  | "subjectScience"
  | "subjectGeography"
  | "subjectBrazilianSocialStudies"
  | "subjectWorldSocialStudies"
  | "subjectVisualArts"
  | "subjectPhysicalEducation"
  | "subjectDigitalEducation";

export type SubjectMeta = {
  icon:
    | "book"
    | "languages"
    | "calculator"
    | "flask"
    | "map-pin"
    | "landmark"
    | "earth"
    | "palette"
    | "dumbbell"
    | "monitor";
  colorClass: string;
  labelKey: SubjectLabelKey;
};

export const SUBJECT_META: Record<LessonPlanSubject, SubjectMeta> = {
  portuguese: { icon: "book", colorClass: "text-sky-400", labelKey: "subjectPortuguese" },
  english: { icon: "languages", colorClass: "text-violet-400", labelKey: "subjectEnglish" },
  math: { icon: "calculator", colorClass: "text-blue-400", labelKey: "subjectMath" },
  science: { icon: "flask", colorClass: "text-emerald-400", labelKey: "subjectScience" },
  geography: { icon: "map-pin", colorClass: "text-rose-400", labelKey: "subjectGeography" },
  "brazilian-social-studies": {
    icon: "landmark",
    colorClass: "text-amber-400",
    labelKey: "subjectBrazilianSocialStudies",
  },
  "world-social-studies": {
    icon: "earth",
    colorClass: "text-orange-400",
    labelKey: "subjectWorldSocialStudies",
  },
  "visual-arts": { icon: "palette", colorClass: "text-pink-400", labelKey: "subjectVisualArts" },
  "physical-education": {
    icon: "dumbbell",
    colorClass: "text-lime-400",
    labelKey: "subjectPhysicalEducation",
  },
  "digital-education": {
    icon: "monitor",
    colorClass: "text-cyan-400",
    labelKey: "subjectDigitalEducation",
  },
};

export const SUBJECT_FILE_SLUG: Record<LessonPlanSubject, string> = {
  portuguese: "portuguese",
  english: "english",
  math: "math",
  science: "science",
  geography: "geography",
  "brazilian-social-studies": "brazilian-social-studies",
  "world-social-studies": "world-social-studies",
  "visual-arts": "visual-arts",
  "physical-education": "physical-education",
  "digital-education": "digital-education",
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
    english: [],
    math: [],
    science: [],
    geography: [],
    "brazilian-social-studies": [],
    "world-social-studies": [],
    "visual-arts": [],
    "physical-education": [],
    "digital-education": [],
  };
}

export function groupCardsBySubjectAndBimestre(
  data: { bimestres: Array<{ bimestre: Bimestre; subjects: Record<LessonPlanSubject, LessonPlanCard[]> }> },
): Record<LessonPlanSubject, Record<Bimestre, LessonPlanCard[]>> {
  const grouped = Object.fromEntries(
    LESSON_PLAN_SUBJECTS.map((subject) => [
      subject,
      Object.fromEntries(LESSON_PLAN_BIMESTRES.map((bimestre) => [bimestre, [] as LessonPlanCard[]])) as Record<
        Bimestre,
        LessonPlanCard[]
      >,
    ]),
  ) as Record<LessonPlanSubject, Record<Bimestre, LessonPlanCard[]>>;

  for (const bimestreData of data.bimestres) {
    for (const subject of LESSON_PLAN_SUBJECTS) {
      grouped[subject][bimestreData.bimestre as Bimestre] = bimestreData.subjects[subject];
    }
  }

  return grouped;
}
