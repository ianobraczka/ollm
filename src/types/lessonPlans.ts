export type Bimestre = 1 | 2 | 3 | 4;

/** Seven subjects shown in the browser UI (matches reference layout). */
export type LessonPlanSubject =
  | "portuguese"
  | "math"
  | "science"
  | "history"
  | "geography"
  | "english"
  | "music";

export type LessonPlanCard = {
  id: string;
  title: string;
  subject: LessonPlanSubject;
  bimestre: Bimestre;
  grade: number;
  unitTitle: string;
  rawContent: string;
};

export type LessonPlansBimestreData = {
  bimestre: Bimestre;
  subjects: Record<LessonPlanSubject, LessonPlanCard[]>;
};

export type LessonPlansGradeData = {
  grade: number;
  bimestres: LessonPlansBimestreData[];
};
