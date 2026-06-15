export type Bimestre = 1 | 2 | 3 | 4;

export type LessonPlanSubject =
  | "portuguese"
  | "english"
  | "math"
  | "science"
  | "geography"
  | "brazilian-social-studies"
  | "world-social-studies"
  | "visual-arts"
  | "physical-education"
  | "digital-education";

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
