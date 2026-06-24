import { normalizeApiArray, schoologyApiGetOptional } from "@/lib/schoology/apiClient";

export type GradingScaleLevel = {
  grade: string;
  cutoff: number;
};

type GradingScaleRecord = {
  id?: string | number;
  scale?: {
    level?: GradingScaleLevel[] | { level?: GradingScaleLevel[] };
  };
};

type GradingScalesResponse = {
  grading_scale?: GradingScaleRecord | GradingScaleRecord[];
};

/** Schoology uses grading_scale_type 2 for rubric-based grading (grading_scale holds rubric id). */
export function isRubricGradingScaleType(value: unknown): boolean {
  return value === 2 || value === "2";
}

/** Pick letter-grade levels for point → letter conversion (section default when assignment uses a rubric). */
export function resolveLetterScaleLevels(
  scaleMap: Map<string, GradingScaleLevel[]>,
  assignmentScaleId?: string,
): GradingScaleLevel[] | undefined {
  if (assignmentScaleId) {
    const assignmentLevels = scaleMap.get(assignmentScaleId);
    if (assignmentLevels?.length) {
      return assignmentLevels;
    }
  }

  const defaultLevels = scaleMap.get("1");
  if (defaultLevels?.length) {
    return defaultLevels;
  }

  for (const levels of scaleMap.values()) {
    if (levels.length) {
      return levels;
    }
  }

  return undefined;
}

function normalizeScaleLevels(scale: GradingScaleRecord): GradingScaleLevel[] {
  const raw = scale.scale?.level;
  const levels = normalizeApiArray(Array.isArray(raw) ? raw : raw?.level);
  return levels
    .map((level) => ({
      grade: String(level.grade).trim(),
      cutoff: Number(level.cutoff),
    }))
    .filter((level) => level.grade)
    .sort((a, b) => a.cutoff - b.cutoff);
}

export async function loadGradingScaleMap(
  sectionId: string,
): Promise<Map<string, GradingScaleLevel[]>> {
  const data = await schoologyApiGetOptional<GradingScalesResponse>(
    `/sections/${sectionId}/grading_scales`,
  );
  const map = new Map<string, GradingScaleLevel[]>();

  for (const scale of normalizeApiArray(data?.grading_scale)) {
    if (scale.id == null) {
      continue;
    }
    const levels = normalizeScaleLevels(scale);
    if (levels.length > 0) {
      map.set(String(scale.id), levels);
    }
  }

  return map;
}

/** Load a section grading scale by the id referenced on assignments/grades. */
export async function ensureGradingScaleLoaded(
  sectionId: string,
  scaleId: string,
  cache: Map<string, GradingScaleLevel[]>,
): Promise<GradingScaleLevel[] | undefined> {
  const cached = cache.get(scaleId);
  if (cached?.length) {
    return cached;
  }

  const data = await schoologyApiGetOptional<GradingScalesResponse>(
    `/sections/${sectionId}/grading_scales/${scaleId}`,
  );
  const scale = normalizeApiArray(data?.grading_scale).find(
    (entry) => entry.id != null && String(entry.id) === scaleId,
  );
  if (!scale) {
    return undefined;
  }

  const levels = normalizeScaleLevels(scale);
  if (levels.length > 0) {
    cache.set(scaleId, levels);
  }
  return levels.length > 0 ? levels : undefined;
}

export async function preloadGradingScales(
  sectionId: string,
  scaleIds: Iterable<string>,
  cache: Map<string, GradingScaleLevel[]>,
): Promise<void> {
  const missing = [...new Set(scaleIds)].filter((id) => !cache.has(id));
  await Promise.all(missing.map((id) => ensureGradingScaleLoaded(sectionId, id, cache)));
}

const LETTER_GRADE_PATTERN = /^[A-F](?:[+-])?$/i;

export function isLetterGrade(value: string): boolean {
  return LETTER_GRADE_PATTERN.test(value.trim());
}

export function pointsToLetterGrade(
  points: number,
  maxPoints: number,
  levels: GradingScaleLevel[],
): string | undefined {
  if (!levels.length || !Number.isFinite(points)) {
    return undefined;
  }

  const percentage = maxPoints > 0 ? (points / maxPoints) * 100 : points;
  let matched = levels[0];

  for (const level of levels) {
    if (percentage >= level.cutoff) {
      matched = level;
    }
  }

  return matched?.grade;
}
