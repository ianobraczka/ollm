import type { CourseSnapshot } from "@/types/schoology";

export type CourseQuestionIntent =
  | "aggregate_missing"
  | "student_profile"
  | "category_performance"
  | "topic_performance"
  | "assignment_deep_dive"
  | "submission_comparison"
  | "course_overview";

export type CourseQuestionClassification = {
  intent: CourseQuestionIntent;
  studentUid?: string;
  studentName?: string;
  categoryName?: string;
  topic?: string;
  missingThreshold?: number;
  /** Grading period titles requested in the question (matched to the course snapshot when possible). */
  gradingPeriods?: string[];
};

const MISSING_THRESHOLD_RE =
  /(?:more than|over|above|at least|>=?)\s*(\d+)|(\d+)\s*\+?\s*(?:or more|missing|activities|assignments)/i;

const DEEP_DIVE_RE =
  /\b(rubric|feedback|grade|grading|comment|essay|submission|submissions|correction|correct)\b/i;

/**
 * Comparative / qualitative analysis across student work samples.
 * Covers English + common pt-BR teacher phrasing for effort, care, and length.
 */
const SUBMISSION_COMPARISON_RE =
  /\b(?:analy[sz](?:e|ing|is)|compar(?:e|ing|ison)|compara(?:r|ção|cao)|esfor[cç]o|effort|depth|profundidade|quality|qualidade|thorough(?:ness)?|capricho|cuidadosamente|careful(?:ly)?|wrote\s+more|write\s+more|who\s+wrote|which\s+students?\s+wrote|longest|most\s+words|word\s+count|qualitative|strongest|weakest|best\s+work|worst\s+work|mais\s+(?:cuidado|capricho|completo|elaborad\w*|extenso)|quem\s+escreveu|escreveram\s+mais|who\s+(?:took|put|showed|demonstrated)|which\s+student|submissions?\b.*\b(?:who|which|compar)|look(?:ing)?\s+at\s+(?:the\s+)?submissions?)\b/i;

const CATEGORY_RE =
  /\b(?:in|on|for)\s+(?:the\s+)?(.+?)\s+(?:category|assignments?|activities|work)\b/i;

/** Prefer explicit topic cues; avoid greedy "on/with …" capturing whole clauses. */
const TOPIC_RELATED_RE =
  /\b(?:related\s+to|regarding|about|topic(?:\s+of)?|unit(?:\s+on)?|lesson(?:\s+on)?|subject(?:\s+of)?|sobre)\s+["']?([^"'.,?!]+)["']?/i;

/** "best performing in the old school game matter" / "in micro:bit" */
const TOPIC_IN_RE =
  /\bin\s+(?:the\s+)?["']?([^"'.,?!]+?)["']?(?:\s+matter)?(?=\s*[.?!,]|$)/i;

const TOPIC_ON_WITH_RE = /\b(?:on|with)\s+["']?([^"'.,?!]+)["']?/i;

/**
 * Ranking + topic in either order:
 * - "best performing students in old school game"
 * - "students who are best performing in the old school game matter"
 */
const TOPIC_AFTER_RANKING_RE =
  /\b(?:(?:best|top|worst|lowest|highest|strongest|weakest)\s+(?:performing\s+)?(?:students?|learners?|kids?|performers?)?\s*(?:who\s+are\s+)?(?:best\s+)?(?:performing\s+)?|(?:students?|learners?|kids?)\s+who\s+are\s+(?:the\s+)?(?:best|top|worst|lowest|highest|strongest|weakest)\s+performing\s+)(?:in|on|for|about|related\s+to)\s+(?:the\s+)?["']?([^"'.,?!]+?)["']?(?:\s+matter)?(?=\s*[.?!,]|$)/i;

const JUNK_TOPIC_RE =
  /^(?:this|the|that|an?)\s+(?:assignment|activity|work|task)(?:\s+\w+)?$/i;

const NON_TOPIC_WORDS_RE =
  /\b(?:worst|best|top|lowest|highest|performance|performing|students?|wrote|write|carefully|careful|quality|effort|who|whom|which|what|how|doing|quarter|assignment|activity|matter)\b/i;

const STUDENT_CONTEXT_RE =
  /\b(?:student|for|does|is)\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s+[A-ZÀ-Ú][\wÀ-ú]+)?)/;

const QUARTER_ORDINAL_PATTERNS: Array<{ ordinal: number; questionRe: RegExp; titleRe: RegExp }> = [
  {
    ordinal: 1,
    questionRe: /\b(?:1st|first|1º|primeiro|q\s*1)\b/i,
    titleRe: /\b(?:1st|first|1º|primeiro|q\s*1|bimestre\s*1|quarter\s*1|period\s*1)\b/i,
  },
  {
    ordinal: 2,
    questionRe: /\b(?:2nd|second|2º|segundo|q\s*2)\b/i,
    titleRe: /\b(?:2nd|second|2º|segundo|q\s*2|bimestre\s*2|quarter\s*2|period\s*2)\b/i,
  },
  {
    ordinal: 3,
    questionRe: /\b(?:3rd|third|3º|terceiro|q\s*3)\b/i,
    titleRe: /\b(?:3rd|third|3º|terceiro|q\s*3|bimestre\s*3|quarter\s*3|period\s*3)\b/i,
  },
  {
    ordinal: 4,
    questionRe: /\b(?:4th|fourth|4º|quarto|q\s*4)\b/i,
    titleRe: /\b(?:4th|fourth|4º|quarto|q\s*4|bimestre\s*4|quarter\s*4|period\s*4)\b/i,
  },
];

function mentionsQuarterComparison(question: string): boolean {
  return (
    /\b(?:quarter|bimestre|grading\s+period|marking\s+period)\b/i.test(question) &&
    /\b(?:compar(?:e|ing|ison)|versus|vs\.?|against|with|across|between)\b/i.test(question)
  );
}

/**
 * Resolve quarter / bimestre mentions to concrete grading-period titles from the course.
 * Falls back to ordinal labels when the snapshot has no period titles yet.
 */
export function extractGradingPeriods(
  question: string,
  availablePeriods: string[] = [],
): string[] {
  const matched = new Set<string>();

  for (const period of availablePeriods) {
    if (normalizeText(question).includes(normalizeText(period))) {
      matched.add(period);
    }
  }

  const ordinals = QUARTER_ORDINAL_PATTERNS.filter((entry) => entry.questionRe.test(question)).map(
    (entry) => entry.ordinal,
  );

  for (const ordinal of ordinals) {
    const pattern = QUARTER_ORDINAL_PATTERNS.find((entry) => entry.ordinal === ordinal);
    if (!pattern) {
      continue;
    }

    const fromAvailable = availablePeriods.filter((period) => pattern.titleRe.test(period));
    if (fromAvailable.length > 0) {
      for (const period of fromAvailable) {
        matched.add(period);
      }
    } else {
      matched.add(
        ordinal === 1
          ? "1st Quarter"
          : ordinal === 2
            ? "2nd Quarter"
            : ordinal === 3
              ? "3rd Quarter"
              : "4th Quarter",
      );
    }
  }

  if (matched.size === 0 && mentionsQuarterComparison(question) && availablePeriods.length > 0) {
    return [...availablePeriods];
  }

  if (
    matched.size === 0 &&
    /\b(?:quarter|bimestre)\b/i.test(question) &&
    availablePeriods.length > 0 &&
    ordinals.length === 0
  ) {
    // "how is she doing this quarter?" → use all periods so the model can contextualize.
    return [...availablePeriods];
  }

  return [...matched];
}

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

function cleanTopicCandidate(raw: string): string | undefined {
  const topic = raw
    .trim()
    // Drop trailing clause tails that greedy "on/with" often swallows.
    .replace(
      /\s+(?:in\s+assignments?|assignments?|activities|category|work|students?|this\s+quarter|the\s+quarter)\b.*$/i,
      "",
    )
    .replace(/\s+matter\s*$/i, "")
    .replace(/\s+(?:assignment|activity|work|category|assignments|activities)s?\s*$/i, "")
    .trim();

  if (topic.length < 3) {
    return undefined;
  }
  if (JUNK_TOPIC_RE.test(topic)) {
    return undefined;
  }
  if (/^(?:this|the|that|an?|it)$/i.test(topic)) {
    return undefined;
  }
  return topic;
}

function isPlausibleShortTopic(topic: string): boolean {
  const words = topic.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) {
    return false;
  }
  // "on this assignment" / "with worst performance…" style captures
  if (NON_TOPIC_WORDS_RE.test(topic)) {
    return false;
  }
  // "1st and 2nd" / "3rd quarter" leftovers from compare phrasing
  if (
    QUARTER_ORDINAL_PATTERNS.some((entry) => entry.questionRe.test(topic)) ||
    /\b(?:and|quarter|bimestre|period)\b/i.test(topic)
  ) {
    return false;
  }
  return true;
}

function extractTopic(question: string): string | undefined {
  const ranking = question.match(TOPIC_AFTER_RANKING_RE);
  if (ranking?.[1]) {
    const topic = cleanTopicCandidate(ranking[1]);
    if (topic && isPlausibleShortTopic(topic)) {
      return topic;
    }
  }

  const related = question.match(TOPIC_RELATED_RE);
  if (related?.[1]) {
    const topic = cleanTopicCandidate(related[1]);
    if (topic) {
      return topic;
    }
  }

  const inPhrase = question.match(TOPIC_IN_RE);
  if (inPhrase?.[1]) {
    const topic = cleanTopicCandidate(inPhrase[1]);
    if (topic && isPlausibleShortTopic(topic)) {
      return topic;
    }
  }

  const onWith = question.match(TOPIC_ON_WITH_RE);
  if (onWith?.[1]) {
    const topic = cleanTopicCandidate(onWith[1]);
    if (topic && isPlausibleShortTopic(topic)) {
      return topic;
    }
  }

  return undefined;
}

function isMissingQuestion(question: string): boolean {
  return /\b(missing|didn'?t submit|not submitted|haven'?t turned|behind on|incomplete work)\b/i.test(
    question,
  );
}

function isStrugglingQuestion(question: string): boolean {
  return /\b(struggl\w*|weak(?:est)?|lowest|failing|difficult(?:y)?|behind|at\s+risk|worst\s+performing|underperform\w*)\b/i.test(
    question,
  );
}

function isPerformanceQuestion(question: string): boolean {
  return /\b(doing well|well on|good at|how is|how's|how are|progress|performing|performance|best\s+performing|top\s+perform|highest\s+scor|who\s+(?:are\s+)?(?:the\s+)?best|top\s+students?)\b/i.test(
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
  const availablePeriods = [
    ...(snapshot.gradingPeriods ?? []),
    ...snapshot.assignments
      .map((assignment) => assignment.gradingPeriod)
      .filter((period): period is string => Boolean(period)),
  ];
  const gradingPeriods = extractGradingPeriods(question, [...new Set(availablePeriods)]);

  // Prefer qualitative submission analysis over topic/gradebook intents,
  // but not when the teacher is comparing gradebook performance across quarters.
  if (
    SUBMISSION_COMPARISON_RE.test(question) &&
    !(student && isPerformanceQuestion(question)) &&
    gradingPeriods.length === 0
  ) {
    return {
      intent: "submission_comparison",
      studentUid: student?.uid,
      studentName: student?.name,
      topic,
      categoryName,
      gradingPeriods: gradingPeriods.length > 0 ? gradingPeriods : undefined,
    };
  }

  if (DEEP_DIVE_RE.test(question) && (focusedAssignmentId || student) && gradingPeriods.length === 0) {
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

  if (
    student &&
    (isStrugglingQuestion(question) ||
      isPerformanceQuestion(question) ||
      categoryName ||
      topic ||
      gradingPeriods.length > 0)
  ) {
    return {
      intent: "student_profile",
      studentUid: student.uid,
      studentName: student.name,
      categoryName,
      topic,
      gradingPeriods: gradingPeriods.length > 0 ? gradingPeriods : undefined,
    };
  }

  if (categoryName && isStrugglingQuestion(question)) {
    return {
      intent: "category_performance",
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

  if (student) {
    return {
      intent: "student_profile",
      studentUid: student.uid,
      studentName: student.name,
      categoryName,
      topic,
      gradingPeriods: gradingPeriods.length > 0 ? gradingPeriods : undefined,
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
  return (
    classification.intent === "assignment_deep_dive" ||
    classification.intent === "submission_comparison"
  );
}

export function needsSubmissionExtracts(classification: CourseQuestionClassification): boolean {
  return (
    classification.intent === "submission_comparison" ||
    classification.intent === "assignment_deep_dive"
  );
}
