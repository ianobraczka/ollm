export type SchoologyMaterialType = "assignment" | "test";

const SCHOOLOGY_BASE = "https://app.schoology.com";

/** Schoology sign-in page. */
export const SCHOOLOGY_LOGIN_URL = `${SCHOOLOGY_BASE}/login`;

/** Teacher home landing page (recent activity — usually no course list). */
export const SCHOOLOGY_HOME_URL = `${SCHOOLOGY_BASE}/home`;

/** Teacher course listing page (sections appear here). */
export const SCHOOLOGY_COURSES_URL = `${SCHOOLOGY_BASE}/courses`;

/** Course materials page (folders, assignments). */
export function buildCourseMaterialsUrl(sectionId: string): string {
  const id = encodeURIComponent(sectionId.trim());
  return `${SCHOOLOGY_BASE}/course/${id}/materials`;
}

/** Extract numeric course/section ID from a Schoology course URL path. */
export function parseCourseIdFromUrl(url: string): string | undefined {
  try {
    const match = new URL(url).pathname.match(/\/course\/(\d+)/);
    return match?.[1];
  } catch {
    const match = url.match(/\/course\/(\d+)/);
    return match?.[1];
  }
}

/** Assignment info page — section ID is not part of this URL. */
export function buildAssignmentUrl(assessmentId: string): string {
  const id = encodeURIComponent(assessmentId.trim());
  return `${SCHOOLOGY_BASE}/assignment/${id}/info`;
}

/**
 * Test / quiz view page — requires both section and assessment IDs.
 *
 * TODO: Confirm for your Schoology instance if tests use a different path.
 */
export function buildTestUrl(sectionId: string, assessmentId: string): string {
  const section = encodeURIComponent(sectionId.trim());
  const assessment = encodeURIComponent(assessmentId.trim());
  return `${SCHOOLOGY_BASE}/course/${section}/materials/test/view/${assessment}`;
}

export function buildAssessmentUrl(
  sectionId: string,
  assessmentId: string,
  materialType: SchoologyMaterialType = "assignment",
): string {
  if (materialType === "test") {
    return buildTestUrl(sectionId, assessmentId);
  }
  return buildAssignmentUrl(assessmentId);
}

export function resolveAssessmentUrl(
  sectionId: string,
  assessmentId: string,
  materialType: SchoologyMaterialType = "assignment",
  urlOverride?: string,
): string {
  const override = urlOverride?.trim();
  if (override) {
    return override;
  }
  return buildAssessmentUrl(sectionId, assessmentId, materialType);
}

export function isLoginUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/login");
  } catch {
    return url.includes("/login");
  }
}
