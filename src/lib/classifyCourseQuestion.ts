import type { CourseSnapshot } from "@/types/schoology";

export type CourseQuestionIntent =
  | "aggregate_missing"
  | "student_profile"
  | "category_performance"
  | "topic_performance"
  | "assignment_deep_dive"
  | "course_overview";

export type CourseQuestionClassification = {
  intent: CourseQuestionIntent;
  studentUid?: string;
  studentName?: string;
  categoryName?: string;
  topic?: string;
  missingThreshold?: number;
};

const MISSING_THRESHOLD_RE =
  /(?:more than|over|above|at least|>=?)\s*(\d+)|(\d+)\s*\+?\s*(?:or more|missing|activities|assignments)/i;

const DEEP_DIVE_RE =
  /\b(rubric|feedback|grade|grading|comment|essay|submission|submissions|correction|correct)\b/i;

const CATEGORY_RE =
  /\b(?:in|on|for)\s+(?:the\s+)?(.+?)\s+(?:category|assignments?|activities|work)\b/i;

const TOPIC_RE =
  /\b(?:about|on|with|regarding|topic|unit|lesson|subject)\s+["']?([^"'.?!]+)["']?/i;

const STUDENT_CONTEXT_RE =
  /\b(?:student|for|does|is)\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)?)/;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function extractMissingThreshold(question: string): number | undefined {
  const match = question.match(MISSING_THRESHOLD_RE);
  if (!match) {
    return undefined;
  }
  const value = match[1] ?? match[2];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findStudent(
  question: string,
  snapshot: CourseSnapshot,
): { uid: string; name: string } | undefined {
  const normalizedQuestion = normalizeText(question);

  let best: { uid: string; name: string; score: number } | undefined;

  for (const student of snapshot.students) {
    const normalizedName = normalizeText(student.name);
    if (!normalizedName) {
      continue;
    }

    if (normalizedQuestion.includes(normalizedName)) {
      const score = normalizedName.length;
      if (!best || score > best.score) {
        best = { uid: student.uid, name: student.name, score };
      }
      continue;
    }

    const parts = normalizedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const firstLast = `${parts[0]} ${parts.at(-1)}`;
      if (normalizedQuestion.includes(firstLast)) {
        const score = firstLast.length;
        if (!best || score > best.score) {
          best = { uid: student.uid, name: student.name, score };
        }
      }
    }
  }

  if (best) {
    return { uid: best.uid, name: best.name };
  }

  const contextMatch = question.match(STUDENT_CONTEXT_RE);
  if (!contextMatch?.[1]) {
    return undefined;
  }

  const candidate = normalizeText(contextMatch[1]);
  return snapshot.students.find((student) => normalizeText(student.name).startsWith(candidate));
}

function findCategory(question: string, snapshot: CourseSnapshot): string | undefined {
  const normalizedQuestion = normalizeText(question);

  let best: string | undefined;
  for (const category of snapshot.categories) {
    const normalizedCategory = normalizeText(category);
    if (normalizedQuestion.includes(normalizedCategory)) {
      if (!best || normalizedCategory.length > best.length) {
        best = category;
      }
    }
  }

  if (best) {
    return best;
  }

  const match = question.match(CATEGORY_RE);
  if (!match?.[1]) {
    return undefined;
  }

  const candidate = normalizeText(match[1]);
  return snapshot.categories.find((category) => normalizeText(category).includes(candidate));
}

function extractTopic(question: string): string | undefined {
  const match = question.match(TOPIC_RE);
  if (!match?.[1]) {
    return undefined;
  }

  const topic = match[1].trim();
  return topic.length >= 3 ? topic : undefined;
}

function isMissingQuestion(question: string): boolean {
  return /\b(missing|didn'?t submit|not submitted|haven'?t turned|behind on|incomplete work)\b/i.test(
    question,
  );
}

function isStrugglingQuestion(question: string): boolean {
  return /\b(struggl|weak|lowest|failing|difficult|difficulty|behind|at risk)\b/i.test(question);
}

function isPerformanceQuestion(question: string): boolean {
  return /\b(doing well|well on|good at|how is|how's|how are|progress|performing|performance)\b/i.test(
    question,
  );
}

function resolveStudent(
  question: string,
  snapshot: CourseSnapshot,
  focusedStudentUid?: string,
): { uid: string; name: string } | undefined {
  const fromQuestion = findStudent(question, snapshot);
  if (fromQuestion) {
    return fromQuestion;
  }

  if (!focusedStudentUid) {
    return undefined;
  }

  const focused = snapshot.students.find((student) => student.uid === focusedStudentUid);
  if (!focused) {
    return undefined;
  }

  return { uid: focused.uid, name: focused.name };
}

export function classifyCourseQuestion(
  question: string,
  snapshot: CourseSnapshot,
  focusedAssignmentId?: string,
  focusedStudentUid?: string,
): CourseQuestionClassification {
  const student = resolveStudent(question, snapshot, focusedStudentUid);
  const categoryName = findCategory(question, snapshot);
  const topic = extractTopic(question);
  const missingThreshold = extractMissingThreshold(question);

  if (DEEP_DIVE_RE.test(question) && (focusedAssignmentId || student)) {
    return {
      intent: "assignment_deep_dive",
      studentUid: student?.uid,
      studentName: student?.name,
    };
  }

  if (isMissingQuestion(question) || missingThreshold != null) {
    return {
      intent: "aggregate_missing",
      missingThreshold: missingThreshold ?? 1,
      studentUid: student?.uid,
      studentName: student?.name,
    };
  }

  if (student && (isStrugglingQuestion(question) || isPerformanceQuestion(question) || categoryName || topic)) {
    return {
      intent: "student_profile",
      studentUid: student.uid,
      studentName: student.name,
      categoryName,
      topic,
    };
  }

  if (topic && (isStrugglingQuestion(question) || isPerformanceQuestion(question))) {
    return {
      intent: "topic_performance",
      topic,
      categoryName,
    };
  }

  if (categoryName && isStrugglingQuestion(question)) {
    return {
      intent: "category_performance",
      categoryName,
      topic,
    };
  }

  if (student) {
    return {
      intent: "student_profile",
      studentUid: student.uid,
      studentName: student.name,
      categoryName,
      topic,
    };
  }

  if (topic) {
    return {
      intent: "topic_performance",
      topic,
      categoryName,
    };
  }

  if (categoryName) {
    return {
      intent: "category_performance",
      categoryName,
    };
  }

  return { intent: "course_overview" };
}

export function needsAssignmentDeepContext(classification: CourseQuestionClassification): boolean {
  return classification.intent === "assignment_deep_dive";
}
