export type SchoologyCourse = {
  id: string;
  /** Combined label for sorting and headers */
  name: string;
  courseTitle?: string;
  sectionTitle?: string;
  url: string;
};

export type SchoologyCoursesResult = {
  courses: SchoologyCourse[];
  extractedAt: string;
  user?: SchoologyUserProfile;
};

export type SchoologyAssignmentSummary = {
  id: string;
  title: string;
  url: string;
  /** Teacher has graded all current student submissions (or none are pending). */
  isFullyGraded: boolean;
};

export type SchoologyGradingPeriodGroup = {
  gradingPeriod: string;
  folderName?: string;
  assignments: SchoologyAssignmentSummary[];
};

export type CourseSnapshotStudent = {
  uid: string;
  name: string;
};

export type CourseSnapshotAssignment = {
  id: string;
  title: string;
  categoryName: string;
  maxPoints?: number;
  dueDate?: string;
};

export type CourseSnapshotSubmissionStatus =
  | "missing"
  | "submitted"
  | "late"
  | "excused"
  | "incomplete"
  | "graded";

export type CourseSnapshotCell = {
  studentUid: string;
  assignmentId: string;
  status: CourseSnapshotSubmissionStatus;
  scorePercent?: number;
  gradeLetter?: string;
  scoreDisplay?: string;
};

export type CourseSnapshot = {
  sectionId: string;
  courseName?: string;
  extractedAt: string;
  students: CourseSnapshotStudent[];
  assignments: CourseSnapshotAssignment[];
  cells: CourseSnapshotCell[];
  categories: string[];
};

export type SchoologyCourseMaterialsResult = {
  sectionId: string;
  courseName?: string;
  gradingPeriods: string[];
  groups: SchoologyGradingPeriodGroup[];
  extractedAt: string;
  snapshot: CourseSnapshot;
};

export type SchoologyMaterialType = "assignment" | "test";

export type SchoologyAssessmentItem = {
  index: number;
  title?: string;
  type?: string;
  points?: string;
  text?: string;
};

export type SchoologyRubricRating = {
  points?: number;
  description?: string;
};

export type SchoologyRubricCriterion = {
  id?: string;
  title: string;
  description?: string;
  maxPoints?: string;
  weight?: string;
  ratings: SchoologyRubricRating[];
};

export type SchoologyRubric = {
  id?: string;
  title: string;
  totalPoints?: string;
  criteria: SchoologyRubricCriterion[];
};

export type SchoologySubmissionFile = {
  id?: string;
  filename: string;
  title?: string;
  url?: string;
  filesize?: number;
  filemime?: string;
};

export type SchoologySubmission = {
  userId?: string;
  studentName?: string;
  status?: string;
  /** Points display, e.g. 85/100 */
  score?: string;
  /** Letter grade when available, e.g. A+ */
  gradeLetter?: string;
  submittedAt?: string;
  late?: boolean;
  draft?: boolean;
  body?: string;
  files: SchoologySubmissionFile[];
};

export type SchoologyLink = {
  text: string;
  href: string;
};

export type SchoologyAssessmentData = {
  title?: string;
  url: string;
  sectionId?: string;
  assessmentId: string;
  materialType?: SchoologyMaterialType;
  courseName?: string;
  dueDate?: string;
  availability?: string;
  status?: string;
  maxPoints?: string;
  description?: string;
  rubric?: SchoologyRubric;
  questions: SchoologyAssessmentItem[];
  submissions: SchoologySubmission[];
  links: SchoologyLink[];
  rawPageText: string;
  extractedAt: string;
};

export type SchoologyUserProfile = {
  id: string;
  name?: string;
  pictureUrl?: string;
};

export type SchoologySessionStatus = {
  hasSession: boolean;
  savedAt?: string;
  user?: SchoologyUserProfile;
  error?: string;
};

export type SchoologyRetrieveRequest = {
  sectionId?: string;
  assessmentId: string;
  materialType?: SchoologyMaterialType;
  urlOverride?: string;
};
