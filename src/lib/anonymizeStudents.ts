import type { ChatMessage } from "@/types/chat";
import type { CourseSnapshotStudent } from "@/types/schoology";

export type StudentAliasMap = {
  /** uid → "Student 1" */
  aliasByUid: Map<string, string>;
  /** "Student 1" → real display name */
  nameByAlias: Map<string, string>;
  /** normalized real name → alias (longest names matched first via namePatterns) */
  aliasByNormalizedName: Map<string, string>;
  /** Real name strings sorted longest-first for safe replacement */
  namePatterns: string[];
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build stable Student N aliases from a course roster.
 * Order follows the snapshot roster so the same student keeps the same label
 * for the lifetime of a request (and across refreshes with the same order).
 */
export function buildStudentAliasMap(
  students: Array<Pick<CourseSnapshotStudent, "uid" | "name">>,
): StudentAliasMap {
  const aliasByUid = new Map<string, string>();
  const nameByAlias = new Map<string, string>();
  const aliasByNormalizedName = new Map<string, string>();
  const namePatterns: string[] = [];

  let index = 1;
  for (const student of students) {
    const uid = student.uid?.trim();
    const name = student.name?.trim();
    if (!uid) continue;

    const alias = `Student ${index}`;
    index += 1;

    aliasByUid.set(uid, alias);
    if (name) {
      nameByAlias.set(alias, name);
      aliasByNormalizedName.set(normalizeName(name), alias);
      namePatterns.push(name);

      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
        if (normalizeName(firstLast) !== normalizeName(name)) {
          aliasByNormalizedName.set(normalizeName(firstLast), alias);
          namePatterns.push(firstLast);
        }
      }
    } else {
      nameByAlias.set(alias, alias);
    }
  }

  namePatterns.sort((a, b) => b.length - a.length);

  return { aliasByUid, nameByAlias, aliasByNormalizedName, namePatterns };
}

export function isStudentNameAnonymizationEnabled(): boolean {
  const raw = process.env.ANONYMIZE_STUDENT_NAMES?.trim().toLowerCase();
  if (raw == null || raw === "") return true;
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

const NAME_KEYS = new Set(["name", "studentname", "student_name"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

/**
 * Deep-clone analytics (or any JSON-like value) and replace real names with aliases.
 * Also rewrites known uid fields that appear next to names when possible.
 */
export function anonymizeStructuredData<T>(value: T, map: StudentAliasMap): T {
  return anonymizeNode(value, map) as T;
}

function anonymizeNode(value: unknown, map: StudentAliasMap): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => anonymizeNode(entry, map));
  }

  if (!isPlainObject(value)) {
    return typeof value === "string" ? redactRosterNamesInText(value, map) : value;
  }

  const result: Record<string, unknown> = {};
  const uid =
    typeof value.uid === "string"
      ? value.uid
      : typeof value.studentUid === "string"
        ? value.studentUid
        : undefined;
  const aliasFromUid = uid ? map.aliasByUid.get(uid) : undefined;

  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (NAME_KEYS.has(lower) && typeof child === "string") {
      const fromName = map.aliasByNormalizedName.get(normalizeName(child));
      result[key] = aliasFromUid ?? fromName ?? redactRosterNamesInText(child, map);
      continue;
    }
    result[key] = anonymizeNode(child, map);
  }

  return result;
}

export function redactRosterNamesInText(text: string, map: StudentAliasMap): string {
  if (!text || map.namePatterns.length === 0) return text;

  let output = text;
  for (const name of map.namePatterns) {
    const alias = map.aliasByNormalizedName.get(normalizeName(name));
    if (!alias) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi");
    output = output.replace(pattern, alias);
  }

  // If the model or context echoes a raw Schoology uid, swap it for the alias.
  for (const [uid, alias] of map.aliasByUid) {
    if (!uid) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(uid)}\\b`, "g");
    output = output.replace(pattern, alias);
  }

  return output;
}

export function rematerializeStudentAliases(text: string, map: StudentAliasMap): string {
  if (!text || map.nameByAlias.size === 0) return text;

  let output = text;
  // Longer aliases first ("Student 10" before "Student 1")
  const aliases = [...map.nameByAlias.keys()].sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    const realName = map.nameByAlias.get(alias);
    if (!realName || realName === alias) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "g");
    output = output.replace(pattern, realName);
  }

  return output;
}

export function anonymizeChatMessages(
  messages: ChatMessage[],
  map: StudentAliasMap,
): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    content: redactRosterNamesInText(message.content, map),
  }));
}
