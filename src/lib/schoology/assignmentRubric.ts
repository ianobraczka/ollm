import { normalizeApiArray, schoologyApiGet, schoologyApiGetOptional } from "@/lib/schoology/apiClient";
import { isRubricGradingScaleType } from "@/lib/schoology/gradingScales";
import type { SchoologyRubric, SchoologyRubricCriterion, SchoologyRubricRating } from "@/types/schoology";

type RubricRatingRaw = {
  points?: number | string;
  description?: string;
};

type RubricCriterionRaw = {
  id?: string | number;
  title?: string;
  description?: string;
  max_points?: number | string;
  weight?: number | string;
  ratings?: RubricRatingRaw[] | { rating?: RubricRatingRaw[] };
};

type RubricDetailResponse = {
  id?: string | number;
  title?: string;
  total_points?: number | string;
  criteria?: RubricCriterionRaw[] | { criterion?: RubricCriterionRaw[] };
};

type RubricsListResponse = {
  grading_rubric?: Array<{ id?: string | number; title?: string }>;
};

function normalizeRatings(raw: RubricCriterionRaw): SchoologyRubricRating[] {
  const ratings = normalizeApiArray(
    Array.isArray(raw.ratings) ? raw.ratings : raw.ratings?.rating,
  );

  return ratings
    .map((rating) => ({
      points: rating.points != null ? Number(rating.points) : undefined,
      description: rating.description?.trim() || undefined,
    }))
    .filter((rating) => rating.description || rating.points != null);
}

function normalizeRubric(data: RubricDetailResponse): SchoologyRubric | null {
  const criteriaRaw = normalizeApiArray(
    Array.isArray(data.criteria) ? data.criteria : data.criteria?.criterion,
  );

  const criteria: SchoologyRubricCriterion[] = criteriaRaw
    .map((criterion) => ({
      id: criterion.id != null ? String(criterion.id) : undefined,
      title: criterion.title?.trim() || "Criterion",
      description: criterion.description?.trim() || undefined,
      maxPoints: criterion.max_points != null ? String(criterion.max_points) : undefined,
      weight: criterion.weight != null ? String(criterion.weight) : undefined,
      ratings: normalizeRatings(criterion),
    }))
    .filter((criterion) => criterion.title || criterion.description || criterion.ratings.length > 0);

  if (criteria.length === 0 && !data.title?.trim()) {
    return null;
  }

  return {
    id: data.id != null ? String(data.id) : undefined,
    title: data.title?.trim() || "Rubric",
    totalPoints: data.total_points != null ? String(data.total_points) : undefined,
    criteria,
  };
}

function extractRubricId(source: Record<string, unknown> | null | undefined): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const key of ["grading_rubric_id", "rubric_id", "rubricId"]) {
    const value = source[key];
    if (value != null && value !== "" && value !== 0 && value !== "0") {
      return String(value);
    }
  }

  const nested = source.rubric ?? source.grading_rubric;
  if (nested && typeof nested === "object" && "id" in nested) {
    const id = (nested as { id?: unknown }).id;
    if (id != null && id !== "" && id !== 0 && id !== "0") {
      return String(id);
    }
  }

  // Rubric-based assignments store the rubric id in grading_scale (type 2), not grading_rubric_id.
  if (isRubricGradingScaleType(source.grading_scale_type)) {
    const rubricId = source.grading_scale;
    if (rubricId != null && rubricId !== "" && rubricId !== 0 && rubricId !== "0") {
      return String(rubricId);
    }
  }

  return undefined;
}

async function fetchRubricById(
  sectionId: string,
  rubricId: string,
): Promise<SchoologyRubric | null> {
  const data = await schoologyApiGetOptional<RubricDetailResponse>(
    `/sections/${sectionId}/grading_rubrics/${rubricId}`,
  );
  return data ? normalizeRubric(data) : null;
}

export async function fetchAssignmentRubric(
  sectionId: string,
  assignmentId: string,
): Promise<SchoologyRubric | null> {
  const assignment = await schoologyApiGet<Record<string, unknown>>(
    `/sections/${sectionId}/assignments/${assignmentId}`,
  );

  const assignmentRubricId = extractRubricId(assignment);
  if (assignmentRubricId) {
    const rubric = await fetchRubricById(sectionId, assignmentRubricId);
    if (rubric) {
      return rubric;
    }
  }

  const gradeItemId =
    assignment?.grade_item_id != null ? String(assignment.grade_item_id) : undefined;

  if (gradeItemId) {
    const gradeItem = await schoologyApiGetOptional<Record<string, unknown>>(
      `/sections/${sectionId}/grade_items/${gradeItemId}`,
    );
    const gradeItemRubricId = extractRubricId(gradeItem);
    if (gradeItemRubricId) {
      const rubric = await fetchRubricById(sectionId, gradeItemRubricId);
      if (rubric) {
        return rubric;
      }
    }
  }

  if (assignment?.show_rubric === true || assignment?.show_rubric === 1 || assignment?.show_rubric === "1") {
    const rubrics = await schoologyApiGetOptional<RubricsListResponse>(
      `/sections/${sectionId}/grading_rubrics`,
    );
    const onlyRubric = rubrics?.grading_rubric?.length === 1 ? rubrics.grading_rubric[0] : undefined;
    if (onlyRubric?.id != null) {
      return fetchRubricById(sectionId, String(onlyRubric.id));
    }
  }

  return null;
}
