import {
  normalizeApiArray,
  schoologyApiGet,
  schoologyApiGetOptional,
} from "@/lib/schoology/apiClient";
import { getSchoologyAppConfig, SCHOOLOGY_WEB_DOMAIN_DEFAULT } from "@/lib/schoology/config";
import type {
  SchoologyAssignmentSummary,
  SchoologyCourseMaterialsResult,
  SchoologyGradingPeriodGroup,
} from "@/types/schoology";

type SectionResponse = {
  course_title?: string;
  section_title?: string;
  grading_periods?: Array<{ id?: string | number; title?: string }> | {
    grading_period?: Array<{ id?: string | number; title?: string }>;
  };
};

type GradingCategoryRecord = {
  id?: string | number;
  title?: string;
};

type GradingCategoryResponse = {
  grading_category?: GradingCategoryRecord[] | { grading_category?: GradingCategoryRecord[] };
};

type AssignmentRecord = {
  id?: string | number;
  title?: string;
  grading_category?: string | number;
  grading_period?: string | number;
  grade_item_id?: string | number;
};

type AssignmentsResponse = {
  assignment?: AssignmentRecord[];
};

type EnrollmentRecord = {
  id?: string | number;
  uid?: string | number;
};

type EnrollmentResponse = {
  enrollment?: EnrollmentRecord | EnrollmentRecord[];
};

type GradeRow = {
  enrollment_id?: string | number;
  assignment_id?: string | number;
  grade?: string | number | null;
  exception?: number;
};

type GradesResponse = {
  grades?: {
    grade?: GradeRow[];
  };
};

type SubmissionRevision = {
  uid?: string | number;
  draft?: number;
};

type SubmissionsResponse = {
  revision?: SubmissionRevision[];
};

function normalizeGradingPeriods(
  section: SectionResponse,
): Array<{ id: string; title: string }> {
  const raw = section.grading_periods;
  const periods = normalizeApiArray(
    Array.isArray(raw) ? raw : raw?.grading_period,
  );

  return periods
    .filter((period) => period.id != null)
    .map((period) => ({
      id: String(period.id),
      title: period.title?.trim() || `Period ${period.id}`,
    }));
}

function countsInGradebook(assignment: AssignmentRecord): boolean {
  return Number(assignment.grading_category ?? 0) > 0;
}

function gradeCountsAsGraded(row: GradeRow): boolean {
  if (row.exception === 1 || row.exception === 2) {
    return true;
  }
  if (row.exception === 3) {
    return false;
  }
  return row.grade != null && row.grade !== "";
}

function buildEnrollmentUidMaps(enrollments: EnrollmentRecord[]) {
  const uidByEnrollmentId = new Map<string, string>();
  const enrollmentIdByUid = new Map<string, string>();

  for (const enrollment of enrollments) {
    if (enrollment.id == null || enrollment.uid == null) {
      continue;
    }
    const enrollmentId = String(enrollment.id);
    const uid = String(enrollment.uid);
    uidByEnrollmentId.set(enrollmentId, uid);
    enrollmentIdByUid.set(uid, enrollmentId);
  }

  return { uidByEnrollmentId, enrollmentIdByUid };
}

function buildGradesByAssignment(allGrades: GradeRow[]): Map<string, Map<string, GradeRow>> {
  const gradesByAssignment = new Map<string, Map<string, GradeRow>>();

  for (const grade of allGrades) {
    if (grade.assignment_id == null || grade.enrollment_id == null) {
      continue;
    }
    const assignmentId = String(grade.assignment_id);
    const enrollmentId = String(grade.enrollment_id);
    if (!gradesByAssignment.has(assignmentId)) {
      gradesByAssignment.set(assignmentId, new Map());
    }
    gradesByAssignment.get(assignmentId)!.set(enrollmentId, grade);
  }

  return gradesByAssignment;
}

async function resolveTeacherGradingStatus(
  sectionId: string,
  assignments: AssignmentRecord[],
  enrollmentIdByUid: Map<string, string>,
  gradesByAssignment: Map<string, Map<string, GradeRow>>,
): Promise<Map<string, boolean>> {
  const statusByAssignment = new Map<string, boolean>();

  await Promise.all(
    assignments.map(async (assignment) => {
      if (assignment.id == null) {
        return;
      }

      const assignmentId = String(assignment.id);
      const gradeItemId = String(assignment.grade_item_id ?? assignment.id);
      const submissions = await schoologyApiGetOptional<SubmissionsResponse>(
        `/sections/${sectionId}/submissions/${gradeItemId}`,
      );

      const submitterUids = new Set<string>();
      for (const revision of normalizeApiArray(submissions?.revision)) {
        if (revision.draft || revision.uid == null) {
          continue;
        }
        submitterUids.add(String(revision.uid));
      }

      if (submitterUids.size === 0) {
        statusByAssignment.set(assignmentId, true);
        return;
      }

      const assignmentGrades = gradesByAssignment.get(assignmentId);
      let allGraded = true;

      for (const uid of submitterUids) {
        const enrollmentId = enrollmentIdByUid.get(uid);
        if (!enrollmentId) {
          allGraded = false;
          break;
        }

        const gradeRow = assignmentGrades?.get(enrollmentId);
        if (!gradeRow || !gradeCountsAsGraded(gradeRow)) {
          allGraded = false;
          break;
        }
      }

      statusByAssignment.set(assignmentId, allGraded);
    }),
  );

  return statusByAssignment;
}

export async function fetchCourseMaterials(
  sectionId: string,
): Promise<SchoologyCourseMaterialsResult> {
  const trimmedSectionId = sectionId.trim();
  const appBase = getSchoologyAppConfig().webDomain.replace(/\/$/, "") || SCHOOLOGY_WEB_DOMAIN_DEFAULT;

  const [sectionData, categoriesData, assignmentsData, enrollmentsData, gradesData] =
    await Promise.all([
      schoologyApiGet<SectionResponse>(`/sections/${trimmedSectionId}`),
      schoologyApiGet<GradingCategoryResponse>(
        `/sections/${trimmedSectionId}/grading_categories`,
      ).catch(() => ({ grading_category: [] } satisfies GradingCategoryResponse)),
      schoologyApiGet<AssignmentsResponse>(`/sections/${trimmedSectionId}/assignments`),
      schoologyApiGet<EnrollmentResponse>(`/sections/${trimmedSectionId}/enrollments`).catch(
        () => ({ enrollment: [] } satisfies EnrollmentResponse),
      ),
      schoologyApiGet<GradesResponse>(`/sections/${trimmedSectionId}/grades`).catch(
        () => ({ grades: { grade: [] } } satisfies GradesResponse),
      ),
    ]);

  const gradingPeriods = normalizeGradingPeriods(sectionData);
  const gradingPeriodTitles = gradingPeriods.map((period) => period.title);

  const categoryNames = new Map<string, string>();
  const categories = Array.isArray(categoriesData.grading_category)
    ? categoriesData.grading_category
    : normalizeApiArray(categoriesData.grading_category?.grading_category);

  for (const category of categories) {
    if (category.id != null) {
      categoryNames.set(String(category.id), category.title?.trim() || `Category ${category.id}`);
    }
  }

  const gradebookAssignments = normalizeApiArray(assignmentsData.assignment).filter(
    (assignment) => assignment.id != null && assignment.title?.trim() && countsInGradebook(assignment),
  );

  const enrollments = normalizeApiArray<EnrollmentRecord>(enrollmentsData.enrollment);
  const { enrollmentIdByUid } = buildEnrollmentUidMaps(enrollments);
  const allGrades = normalizeApiArray<GradeRow>(gradesData.grades?.grade);
  const gradesByAssignment = buildGradesByAssignment(allGrades);
  const gradingStatus = await resolveTeacherGradingStatus(
    trimmedSectionId,
    gradebookAssignments,
    enrollmentIdByUid,
    gradesByAssignment,
  );

  const assignmentsByCategory = new Map<string, SchoologyAssignmentSummary[]>();

  for (const assignment of gradebookAssignments) {
    const assignmentId = String(assignment.id);
    const categoryId = String(assignment.grading_category ?? "0");
    const categoryName = categoryNames.get(categoryId) || "Uncategorized";

    const summary: SchoologyAssignmentSummary = {
      id: assignmentId,
      title: assignment.title!.trim(),
      url: `${appBase}/assignment/${assignmentId}/info`,
      isFullyGraded: gradingStatus.get(assignmentId) ?? false,
    };

    if (!assignmentsByCategory.has(categoryName)) {
      assignmentsByCategory.set(categoryName, []);
    }
    assignmentsByCategory.get(categoryName)!.push(summary);
  }

  const groups: SchoologyGradingPeriodGroup[] = [];

  if (gradingPeriods.length > 0) {
    for (const period of gradingPeriods) {
      const matchingCategory = [...assignmentsByCategory.entries()].find(([categoryName]) =>
        categoryName.toLowerCase().includes(period.title.toLowerCase()),
      );

      groups.push({
        gradingPeriod: period.title,
        folderName: matchingCategory?.[0],
        assignments: matchingCategory?.[1] ?? [],
      });
    }
  }

  const usedCategories = new Set(groups.map((group) => group.folderName).filter(Boolean));

  for (const [categoryName, assignments] of assignmentsByCategory.entries()) {
    if (assignments.length === 0 || usedCategories.has(categoryName)) {
      continue;
    }

    groups.push({
      gradingPeriod: categoryName,
      folderName: categoryName,
      assignments,
    });
  }

  if (groups.length === 0) {
    for (const [categoryName, assignments] of assignmentsByCategory.entries()) {
      if (assignments.length === 0) {
        continue;
      }
      groups.push({
        gradingPeriod: categoryName,
        folderName: categoryName,
        assignments,
      });
    }
  }

  const courseTitle = sectionData.course_title?.trim();
  const sectionTitle = sectionData.section_title?.trim();
  const courseName =
    courseTitle && sectionTitle && courseTitle !== sectionTitle
      ? `${courseTitle} — ${sectionTitle}`
      : courseTitle || sectionTitle;

  return {
    sectionId: trimmedSectionId,
    courseName,
    gradingPeriods: gradingPeriodTitles,
    groups,
    extractedAt: new Date().toISOString(),
  };
}
