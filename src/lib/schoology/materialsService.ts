import {
  normalizeApiArray,
  schoologyApiGet,
  schoologyApiGetOptional,
} from "@/lib/schoology/apiClient";
import { getSchoologyAppConfig, SCHOOLOGY_WEB_DOMAIN_DEFAULT } from "@/lib/schoology/config";
import type {
  CourseSnapshot,
  CourseSnapshotCell,
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
  max_points?: string | number;
  due?: string;
};

type AssignmentsResponse = {
  assignment?: AssignmentRecord[];
};

type EnrollmentRecord = {
  id?: string | number;
  uid?: string | number;
  name_display?: string;
  name_first?: string;
  name_last?: string;
};

type EnrollmentResponse = {
  enrollment?: EnrollmentRecord | EnrollmentRecord[];
};

type GradeRow = {
  enrollment_id?: string | number;
  assignment_id?: string | number;
  grade?: string | number | null;
  exception?: number;
  max_points?: string | number;
};

type GradesResponse = {
  grades?: {
    grade?: GradeRow[];
  };
};

type SubmissionRevision = {
  uid?: string | number;
  draft?: number;
  late?: number;
  created?: number;
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

type StudentSubmissionState = {
  submitted: boolean;
  late: boolean;
};

function isLetterGrade(value: string): boolean {
  return /^[A-F][+-]?$/i.test(value.trim());
}

function parseNumericGrade(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatEnrollmentName(enrollment: EnrollmentRecord): string {
  return (
    enrollment.name_display?.trim() ||
    [enrollment.name_first, enrollment.name_last].filter(Boolean).join(" ").trim() ||
    (enrollment.uid != null ? `Student ${enrollment.uid}` : "Unknown student")
  );
}

function deriveCellStatus(args: {
  submission?: StudentSubmissionState;
  gradeRow?: GradeRow;
  assignmentMaxPoints?: number;
}): Pick<CourseSnapshotCell, "status" | "scorePercent" | "gradeLetter" | "scoreDisplay"> {
  const { submission, gradeRow, assignmentMaxPoints } = args;

  if (gradeRow?.exception === 1) {
    return { status: "excused", scoreDisplay: "Excused" };
  }

  if (gradeRow?.exception === 2) {
    return { status: "incomplete", scoreDisplay: "Incomplete" };
  }

  if (gradeRow?.exception === 3) {
    return { status: "missing" };
  }

  const rawGrade = gradeRow?.grade;
  if (rawGrade != null && rawGrade !== "") {
    const rawGradeString = String(rawGrade).trim();
    if (isLetterGrade(rawGradeString)) {
      return {
        status: "graded",
        gradeLetter: rawGradeString.toUpperCase(),
        scoreDisplay: rawGradeString.toUpperCase(),
      };
    }

    const points = parseNumericGrade(rawGrade);
    const maxPoints =
      parseNumericGrade(gradeRow?.max_points) ?? assignmentMaxPoints ?? points;
    if (points != null && maxPoints != null && maxPoints > 0) {
      const scorePercent = Math.round((points / maxPoints) * 1000) / 10;
      return {
        status: "graded",
        scorePercent,
        scoreDisplay: `${points}/${maxPoints}`,
      };
    }

    if (points != null) {
      return {
        status: "graded",
        scoreDisplay: String(points),
      };
    }
  }

  if (submission?.submitted) {
    return {
      status: submission.late ? "late" : "submitted",
    };
  }

  return { status: "missing" };
}

function buildCourseSnapshot(args: {
  sectionId: string;
  courseName?: string;
  extractedAt: string;
  appBase: string;
  enrollments: EnrollmentRecord[];
  enrollmentIdByUid: Map<string, string>;
  gradebookAssignments: AssignmentRecord[];
  categoryNames: Map<string, string>;
  gradesByAssignment: Map<string, Map<string, GradeRow>>;
  submissionsByAssignment: Map<string, Map<string, StudentSubmissionState>>;
}): CourseSnapshot {
  const students = args.enrollments
    .filter((enrollment) => enrollment.uid != null)
    .map((enrollment) => ({
      uid: String(enrollment.uid),
      name: formatEnrollmentName(enrollment),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const assignments = args.gradebookAssignments.map((assignment) => {
    const categoryId = String(assignment.grading_category ?? "0");
    const maxPoints = parseNumericGrade(assignment.max_points);
    return {
      id: String(assignment.id),
      title: assignment.title!.trim(),
      categoryName: args.categoryNames.get(categoryId) || "Uncategorized",
      url: `${args.appBase}/assignment/${String(assignment.id)}/info`,
      ...(maxPoints != null ? { maxPoints } : {}),
      ...(assignment.due?.trim() ? { dueDate: assignment.due.trim() } : {}),
    };
  });

  const categories = [...new Set(assignments.map((assignment) => assignment.categoryName))].sort(
    (a, b) => a.localeCompare(b),
  );

  const cells: CourseSnapshotCell[] = [];

  for (const student of students) {
    const enrollmentId = args.enrollmentIdByUid.get(student.uid);

    for (const assignment of args.gradebookAssignments) {
      const assignmentId = String(assignment.id);
      const submission = args.submissionsByAssignment
        .get(assignmentId)
        ?.get(student.uid);
      const gradeRow = enrollmentId
        ? args.gradesByAssignment.get(assignmentId)?.get(enrollmentId)
        : undefined;
      const assignmentMaxPoints = parseNumericGrade(assignment.max_points);
      const derived = deriveCellStatus({ submission, gradeRow, assignmentMaxPoints });

      cells.push({
        studentUid: student.uid,
        assignmentId,
        ...derived,
      });
    }
  }

  return {
    sectionId: args.sectionId,
    courseName: args.courseName,
    extractedAt: args.extractedAt,
    students,
    assignments,
    cells,
    categories,
  };
}

async function resolveAssignmentSubmissionData(
  sectionId: string,
  assignments: AssignmentRecord[],
  enrollmentIdByUid: Map<string, string>,
  gradesByAssignment: Map<string, Map<string, GradeRow>>,
): Promise<{
  gradingStatus: Map<string, boolean>;
  submissionsByAssignment: Map<string, Map<string, StudentSubmissionState>>;
}> {
  const gradingStatus = new Map<string, boolean>();
  const submissionsByAssignment = new Map<string, Map<string, StudentSubmissionState>>();

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

      const submitterStates = new Map<string, StudentSubmissionState>();
      const latestRevision = new Map<string, { late: boolean; created: number }>();

      for (const revision of normalizeApiArray(submissions?.revision)) {
        if (revision.draft || revision.uid == null) {
          continue;
        }

        const uid = String(revision.uid);
        const created = revision.created ?? 0;
        const existing = latestRevision.get(uid);

        if (existing && created <= existing.created) {
          continue;
        }

        latestRevision.set(uid, {
          late: revision.late === 1,
          created,
        });
      }

      for (const [uid, state] of latestRevision.entries()) {
        submitterStates.set(uid, {
          submitted: true,
          late: state.late,
        });
      }

      submissionsByAssignment.set(assignmentId, submitterStates);

      if (submitterStates.size === 0) {
        gradingStatus.set(assignmentId, true);
        return;
      }

      const assignmentGrades = gradesByAssignment.get(assignmentId);
      let allGraded = true;

      for (const uid of submitterStates.keys()) {
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

      gradingStatus.set(assignmentId, allGraded);
    }),
  );

  return { gradingStatus, submissionsByAssignment };
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
  const { gradingStatus, submissionsByAssignment } = await resolveAssignmentSubmissionData(
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

  const extractedAt = new Date().toISOString();
  const snapshot = buildCourseSnapshot({
    sectionId: trimmedSectionId,
    courseName,
    extractedAt,
    appBase,
    enrollments,
    enrollmentIdByUid,
    gradebookAssignments,
    categoryNames,
    gradesByAssignment,
    submissionsByAssignment,
  });

  return {
    sectionId: trimmedSectionId,
    courseName,
    gradingPeriods: gradingPeriodTitles,
    groups,
    extractedAt,
    snapshot,
  };
}
