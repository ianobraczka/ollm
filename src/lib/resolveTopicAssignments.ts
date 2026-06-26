import { fetchAssignmentApiDetails } from "@/lib/schoology/assignmentSubmissions";
import {
  filterAssignmentsByTopic,
  filterAssignmentsByTopicWithDescriptions,
} from "@/lib/topicMatching";
import type { CourseSnapshot } from "@/types/schoology";

const MAX_DESCRIPTION_FETCH = 12;
const MIN_TITLE_MATCHES_WITHOUT_DESCRIPTIONS = 3;

export type TopicResolutionResult = {
  assignmentIds: string[];
  descriptions: Map<string, string>;
};

function getStudentAssignmentRows(
  snapshot: CourseSnapshot,
  studentUid: string,
): Array<{ id: string; scorePercent: number; missing: boolean }> {
  return snapshot.assignments.map((assignment) => {
    const cell = snapshot.cells.find(
      (entry) => entry.studentUid === studentUid && entry.assignmentId === assignment.id,
    );
    return {
      id: assignment.id,
      scorePercent: cell?.scorePercent ?? 101,
      missing: cell?.status === "missing",
    };
  });
}

function selectCandidateIdsForDescriptionScan(
  snapshot: CourseSnapshot,
  topic: string,
  studentUid?: string,
): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  const add = (assignmentId: string) => {
    if (seen.has(assignmentId) || selected.length >= MAX_DESCRIPTION_FETCH) {
      return;
    }
    seen.add(assignmentId);
    selected.push(assignmentId);
  };

  for (const assignment of filterAssignmentsByTopic(snapshot.assignments, topic)) {
    add(assignment.id);
  }

  if (studentUid) {
    const rows = getStudentAssignmentRows(snapshot, studentUid);

    const lowest = [...rows].sort((a, b) => {
      if (a.missing !== b.missing) {
        return a.missing ? -1 : 1;
      }
      return a.scorePercent - b.scorePercent;
    });
    for (const row of lowest.slice(0, 5)) {
      add(row.id);
    }

    const highest = [...rows]
      .filter((row) => row.scorePercent <= 100)
      .sort((a, b) => b.scorePercent - a.scorePercent);
    for (const row of highest.slice(0, 3)) {
      add(row.id);
    }

    for (const row of rows) {
      if (row.missing) {
        add(row.id);
      }
    }

    for (const row of rows) {
      add(row.id);
    }
  } else {
    for (const assignment of snapshot.assignments) {
      add(assignment.id);
    }
  }

  return selected;
}

async function fetchAssignmentDescriptions(
  sectionId: string,
  assignmentIds: string[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    assignmentIds.map(async (assignmentId) => {
      const details = await fetchAssignmentApiDetails(sectionId, assignmentId).catch(() => null);
      return [assignmentId, details?.description?.trim() ?? ""] as const;
    }),
  );

  return new Map(entries);
}

export async function resolveTopicAssignments(
  sectionId: string,
  snapshot: CourseSnapshot,
  topic: string,
  studentUid?: string,
): Promise<TopicResolutionResult> {
  const trimmedTopic = topic.trim();
  if (!trimmedTopic) {
    return { assignmentIds: [], descriptions: new Map() };
  }

  const titleMatches = filterAssignmentsByTopic(snapshot.assignments, trimmedTopic);
  if (titleMatches.length >= MIN_TITLE_MATCHES_WITHOUT_DESCRIPTIONS) {
    return {
      assignmentIds: titleMatches.map((assignment) => assignment.id),
      descriptions: new Map(),
    };
  }

  const candidateIds = selectCandidateIdsForDescriptionScan(snapshot, trimmedTopic, studentUid);
  if (candidateIds.length === 0) {
    return {
      assignmentIds: titleMatches.map((assignment) => assignment.id),
      descriptions: new Map(),
    };
  }

  const descriptions = await fetchAssignmentDescriptions(sectionId, candidateIds);
  const candidates = snapshot.assignments.filter((assignment) =>
    candidateIds.includes(assignment.id),
  );
  const descriptionMatches = filterAssignmentsByTopicWithDescriptions(
    candidates,
    trimmedTopic,
    descriptions,
  );

  const assignmentIds = new Set<string>();
  for (const assignment of titleMatches) {
    assignmentIds.add(assignment.id);
  }
  for (const assignment of descriptionMatches) {
    assignmentIds.add(assignment.id);
  }

  return {
    assignmentIds: [...assignmentIds],
    descriptions,
  };
}
