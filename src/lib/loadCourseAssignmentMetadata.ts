import { fetchAssignmentApiDetails } from "@/lib/schoology/assignmentSubmissions";
import { fetchAssignmentRubric } from "@/lib/schoology/assignmentRubric";
import type { CourseQuestionClassification } from "@/lib/classifyCourseQuestion";
import type { CourseSnapshot, CourseSnapshotAssignment } from "@/types/schoology";

const MAX_ASSIGNMENTS = 8;
const MAX_DESCRIPTION_CHARS = 400;

export function shouldLoadAssignmentMetadata(
  classification: CourseQuestionClassification,
): boolean {
  return (
    classification.intent === "student_profile" ||
    classification.intent === "topic_performance" ||
    classification.intent === "category_performance"
  );
}

function filterAssignmentsByTopic(
  assignments: CourseSnapshotAssignment[],
  topic: string,
): CourseSnapshotAssignment[] {
  const tokens = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 3);

  if (tokens.length === 0) {
    return [];
  }

  return assignments.filter((assignment) => {
    const haystack = assignment.title.toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  });
}

function getLowestScoredAssignmentIds(
  snapshot: CourseSnapshot,
  studentUid: string,
  limit: number,
): string[] {
  const rows = snapshot.assignments
    .map((assignment) => {
      const cell = snapshot.cells.find(
        (entry) => entry.studentUid === studentUid && entry.assignmentId === assignment.id,
      );
      return {
        id: assignment.id,
        scorePercent: cell?.scorePercent ?? 101,
        missing: cell?.status === "missing",
      };
    })
    .sort((a, b) => {
      if (a.missing !== b.missing) {
        return a.missing ? -1 : 1;
      }
      return a.scorePercent - b.scorePercent;
    });

  return rows.slice(0, limit).map((row) => row.id);
}

export function selectAssignmentIdsForMetadata(
  snapshot: CourseSnapshot,
  classification: CourseQuestionClassification,
  options: {
    focusedStudentUid?: string;
    focusedAssignmentId?: string;
  } = {},
): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  const add = (assignmentId: string) => {
    if (seen.has(assignmentId) || selected.length >= MAX_ASSIGNMENTS) {
      return;
    }
    seen.add(assignmentId);
    selected.push(assignmentId);
  };

  if (options.focusedAssignmentId) {
    add(options.focusedAssignmentId);
  }

  const studentUid = classification.studentUid ?? options.focusedStudentUid;

  if (classification.categoryName) {
    const normalizedCategory = classification.categoryName.toLowerCase();
    for (const assignment of snapshot.assignments) {
      if (assignment.categoryName.toLowerCase() === normalizedCategory) {
        add(assignment.id);
      }
    }
  }

  if (classification.topic) {
    for (const assignment of filterAssignmentsByTopic(snapshot.assignments, classification.topic)) {
      add(assignment.id);
    }
  }

  if (studentUid) {
    for (const assignmentId of getLowestScoredAssignmentIds(snapshot, studentUid, 5)) {
      add(assignmentId);
    }
  }

  if (classification.topic && selected.length === 0) {
    for (const assignment of snapshot.assignments.slice(0, MAX_ASSIGNMENTS)) {
      add(assignment.id);
    }
  }

  return selected;
}

function truncateText(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars)}…`;
}

function formatRubricSummary(
  rubric: Awaited<ReturnType<typeof fetchAssignmentRubric>>,
): string | undefined {
  if (!rubric || rubric.criteria.length === 0) {
    return undefined;
  }

  const lines = [`Rubric: ${rubric.title}`];
  for (const criterion of rubric.criteria.slice(0, 6)) {
    lines.push(`- ${criterion.title}${criterion.maxPoints ? ` (${criterion.maxPoints} pts)` : ""}`);
  }
  if (rubric.criteria.length > 6) {
    lines.push(`- …and ${rubric.criteria.length - 6} more criteria`);
  }
  return lines.join("\n");
}

async function loadOneAssignmentMetadata(
  sectionId: string,
  assignment: CourseSnapshotAssignment,
): Promise<string> {
  const [details, rubric] = await Promise.all([
    fetchAssignmentApiDetails(sectionId, assignment.id).catch(() => null),
    fetchAssignmentRubric(sectionId, assignment.id).catch(() => null),
  ]);

  const blocks = [`Assignment: ${assignment.title} (ID ${assignment.id})`];
  blocks.push(`Category: ${assignment.categoryName}`);

  const description = details?.description?.trim();
  if (description) {
    blocks.push(`Description: ${truncateText(description, MAX_DESCRIPTION_CHARS)}`);
  }

  const rubricSummary = formatRubricSummary(rubric);
  if (rubricSummary) {
    blocks.push(rubricSummary);
  }

  return blocks.join("\n");
}

export async function loadCourseAssignmentMetadata(
  sectionId: string,
  snapshot: CourseSnapshot,
  assignmentIds: string[],
): Promise<string> {
  if (assignmentIds.length === 0) {
    return "";
  }

  const assignments = assignmentIds
    .map((id) => snapshot.assignments.find((assignment) => assignment.id === id))
    .filter((assignment): assignment is CourseSnapshotAssignment => assignment != null);

  const blocks = await Promise.all(
    assignments.map((assignment) => loadOneAssignmentMetadata(sectionId, assignment)),
  );

  return blocks.join("\n\n");
}
