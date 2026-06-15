import type { ChatMessage } from "@/types/chat";

export type CurriculumSubject =
  | "math"
  | "science"
  | "digital-education"
  | "portuguese"
  | "english"
  | "geography"
  | "brazilian-social-studies"
  | "world-social-studies"
  | "visual-arts"
  | "physical-education";

export type CurriculumPeriod =
  | "first-quarter"
  | "second-quarter"
  | "third-quarter"
  | "fourth-quarter";

export type InterdisciplinaryOutputType =
  | "lesson-plan"
  | "interdisciplinary-project"
  | "learning-sequence";

export type InterdisciplinaryFormValues = {
  grade: number;
  period: CurriculumPeriod;
  primarySubject: CurriculumSubject;
  secondarySubject: CurriculumSubject | "";
  outputType: InterdisciplinaryOutputType;
  teacherGoal: string;
};

export type InterdisciplinaryPlanRequest = {
  grade: number;
  period: CurriculumPeriod;
  primarySubject: CurriculumSubject;
  secondarySubject?: CurriculumSubject | "";
  outputType: InterdisciplinaryOutputType;
  teacherGoal?: string;
  responseLanguage?: string;
  messages?: ChatMessage[];
  selectedBuiltInDocs?: string[];
  uploadedDocumentText?: string;
  useUploadedDocument?: boolean;
};

export type CurriculumContextResult = {
  context: string;
  primaryLabel: string;
  connectedLabels: string[];
  mode: "single-secondary" | "auto-discover";
};
