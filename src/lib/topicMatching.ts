import type { CourseSnapshotAssignment } from "@/types/schoology";

export function expandTopicTokens(topic: string): string[] {
  const raw = topic.toLowerCase().trim();
  const tokens = new Set<string>();

  for (const part of raw.split(/\s+/)) {
    if (part.length >= 2) {
      tokens.add(part);
    }
  }

  const compact = raw.replace(/[^a-z0-9]/g, "");
  if (compact.length >= 3) {
    tokens.add(compact);
  }

  if (raw.includes("micro") && raw.includes("bit")) {
    tokens.add("micro:bit");
    tokens.add("microbit");
  }

  return [...tokens];
}

export function textMatchesTopic(haystack: string, topic: string): boolean {
  const lower = haystack.toLowerCase();
  const compactHaystack = lower.replace(/[^a-z0-9]/g, "");

  for (const token of expandTopicTokens(topic)) {
    if (token.length < 3) {
      continue;
    }

    if (lower.includes(token)) {
      return true;
    }

    const compactToken = token.replace(/[^a-z0-9]/g, "");
    if (compactToken.length >= 3 && compactHaystack.includes(compactToken)) {
      return true;
    }
  }

  return false;
}

export function filterAssignmentsByTopic(
  assignments: CourseSnapshotAssignment[],
  topic: string,
): CourseSnapshotAssignment[] {
  if (!topic.trim()) {
    return [];
  }

  return assignments.filter((assignment) => textMatchesTopic(assignment.title, topic));
}

export function filterAssignmentsByTopicWithDescriptions(
  assignments: CourseSnapshotAssignment[],
  topic: string,
  descriptions: Map<string, string>,
): CourseSnapshotAssignment[] {
  if (!topic.trim()) {
    return [];
  }

  return assignments.filter((assignment) => {
    if (textMatchesTopic(assignment.title, topic)) {
      return true;
    }

    const description = descriptions.get(assignment.id);
    return description ? textMatchesTopic(description, topic) : false;
  });
}
