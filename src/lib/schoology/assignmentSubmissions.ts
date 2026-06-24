import { normalizeApiArray, schoologyApiGet } from "@/lib/schoology/apiClient";
import {
  isLetterGrade,
  isRubricGradingScaleType,
  loadGradingScaleMap,
  pointsToLetterGrade,
  preloadGradingScales,
  resolveLetterScaleLevels,
  type GradingScaleLevel,
} from "@/lib/schoology/gradingScales";
import { buildProxiedFileUrl } from "@/lib/schoology/schoologyFileUrls";
import type { SchoologySubmission, SchoologySubmissionFile } from "@/types/schoology";

type AssignmentDetailResponse = {
  id?: string | number;
  title?: string;
  due?: string;
  max_points?: string | number;
  grade_item_id?: string | number;
  grading_scale?: string | number;
  grading_scale_type?: string | number;
  description?: string;
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

type SubmissionRevision = {
  revision_id?: string | number;
  uid?: string | number;
  created?: number;
  late?: number;
  draft?: number;
  body?: string;
  attachments?: {
    files?: {
      file?: Array<{
        id?: string | number;
        title?: string;
        filename?: string;
        download_path?: string;
        filesize?: number;
        filemime?: string;
      }> | {
        id?: string | number;
        title?: string;
        filename?: string;
        download_path?: string;
        filesize?: number;
        filemime?: string;
      };
    };
  };
};

type SubmissionsResponse = {
  revision?: SubmissionRevision[];
};

type GradeEntry = {
  enrollment_id?: string | number;
  grade?: string | number | null;
  max_points?: string | number;
  exception?: number;
  timestamp?: number;
  scale_id?: string | number;
  calculated_grade?: string | number | null;
};

type GradesResponse = {
  grades?: {
    grade?: GradeEntry[];
  };
};

type FormattedGrade = {
  score?: string;
  gradeLetter?: string;
};

function formatTimestamp(unixSeconds?: number): string | undefined {
  if (!unixSeconds) {
    return undefined;
  }
  try {
    return new Date(unixSeconds * 1000).toISOString();
  } catch {
    return undefined;
  }
}

function parseNumericGrade(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatGrade(
  grade: GradeEntry,
  scaleMap: Map<string, GradingScaleLevel[]>,
  assignmentScaleId?: string,
  fallbackLetterLevels?: GradingScaleLevel[],
): FormattedGrade | undefined {
  if (grade.exception === 1) {
    return { score: "Excused" };
  }
  if (grade.exception === 2) {
    return { score: "Incomplete" };
  }
  if (grade.exception === 3) {
    return undefined;
  }

  const rawGrade = grade.grade;
  if (rawGrade == null || rawGrade === "") {
    return undefined;
  }

  const rawGradeString = String(rawGrade).trim();
  if (isLetterGrade(rawGradeString)) {
    return { gradeLetter: rawGradeString.toUpperCase() };
  }

  const calculated = grade.calculated_grade;
  if (calculated != null && calculated !== "") {
    const calculatedString = String(calculated).trim();
    if (isLetterGrade(calculatedString)) {
      return { gradeLetter: calculatedString.toUpperCase() };
    }
  }

  const points = parseNumericGrade(rawGrade);
  if (points == null) {
    return { score: rawGradeString };
  }

  const maxPoints = parseNumericGrade(grade.max_points) ?? points;
  const scaleId = grade.scale_id != null ? String(grade.scale_id) : assignmentScaleId;
  let levels = scaleId ? scaleMap.get(scaleId) : undefined;
  if (!levels?.length) {
    levels = fallbackLetterLevels;
  }
  const letter = levels ? pointsToLetterGrade(points, maxPoints, levels) : undefined;

  const pointsDisplay = grade.max_points
    ? `${points}/${grade.max_points}`
    : String(points);

  if (letter) {
    return { gradeLetter: letter, score: pointsDisplay };
  }

  return { score: pointsDisplay };
}

function parseSubmissionFiles(revision: SubmissionRevision): SchoologySubmissionFile[] {
  const rawFiles = revision.attachments?.files?.file;
  return normalizeApiArray(rawFiles)
    .map((file) => {
      const filename = file.filename?.trim() || file.title?.trim() || "File";
      const downloadPath = file.download_path?.trim() || undefined;
      return {
        id: file.id != null ? String(file.id) : undefined,
        filename,
        title: file.title?.trim() || undefined,
        url: downloadPath ? buildProxiedFileUrl(downloadPath, filename) : undefined,
        filesize: typeof file.filesize === "number" ? file.filesize : undefined,
        filemime: file.filemime?.trim() || undefined,
      };
    })
    .filter((file) => file.filename);
}

export type AssignmentApiDetails = {
  title?: string;
  due?: string;
  maxPoints?: string;
  description?: string;
};

export async function fetchAssignmentApiDetails(
  sectionId: string,
  assignmentId: string,
): Promise<AssignmentApiDetails | null> {
  const data = await schoologyApiGet<AssignmentDetailResponse>(
    `/sections/${sectionId}/assignments/${assignmentId}`,
  );

  if (!data) {
    return null;
  }

  return {
    title: data.title?.trim() || undefined,
    due: data.due?.trim() || undefined,
    maxPoints: data.max_points != null ? String(data.max_points) : undefined,
    description: data.description?.trim() || undefined,
  };
}

export async function fetchAssignmentSubmissions(
  sectionId: string,
  assignmentId: string,
): Promise<SchoologySubmission[]> {
  const assignment = await schoologyApiGet<AssignmentDetailResponse>(
    `/sections/${sectionId}/assignments/${assignmentId}`,
  );

  const gradeItemId = String(assignment?.grade_item_id ?? assignmentId);
  const assignmentRubricId =
    isRubricGradingScaleType(assignment?.grading_scale_type) &&
    assignment?.grading_scale != null
      ? String(assignment.grading_scale)
      : undefined;
  const assignmentScaleId =
    assignment?.grading_scale != null && !assignmentRubricId
      ? String(assignment.grading_scale)
      : undefined;

  const [enrollmentsData, submissionsData, gradesData, scaleMap] = await Promise.all([
    schoologyApiGet<EnrollmentResponse>(`/sections/${sectionId}/enrollments`),
    schoologyApiGet<SubmissionsResponse>(
      `/sections/${sectionId}/submissions/${gradeItemId}`,
      { query: { with_attachments: 1 } },
    ),
    schoologyApiGet<GradesResponse>(`/sections/${sectionId}/grades`, {
      query: { assignment_id: assignmentId },
    }),
    loadGradingScaleMap(sectionId),
  ]);

  const scaleIds = new Set<string>();
  if (assignmentScaleId) {
    scaleIds.add(assignmentScaleId);
  }
  for (const grade of normalizeApiArray<GradeEntry>(gradesData.grades?.grade)) {
    if (grade.scale_id == null) {
      continue;
    }
    const scaleId = String(grade.scale_id);
    if (scaleId !== assignmentRubricId) {
      scaleIds.add(scaleId);
    }
  }
  await preloadGradingScales(sectionId, scaleIds, scaleMap);

  const letterScaleLevels = resolveLetterScaleLevels(scaleMap, assignmentScaleId);

  const namesByUid = new Map<string, string>();
  const uidByEnrollmentId = new Map<string, string>();

  for (const enrollment of normalizeApiArray<EnrollmentRecord>(enrollmentsData.enrollment)) {
    if (enrollment.uid == null) {
      continue;
    }
    const uid = String(enrollment.uid);
    const name =
      enrollment.name_display?.trim() ||
      [enrollment.name_first, enrollment.name_last].filter(Boolean).join(" ").trim() ||
      undefined;
    if (name) {
      namesByUid.set(uid, name);
    }
    if (enrollment.id != null) {
      uidByEnrollmentId.set(String(enrollment.id), uid);
    }
  }

  const gradesByUid = new Map<string, GradeEntry>();
  for (const grade of normalizeApiArray<GradeEntry>(gradesData.grades?.grade)) {
    if (grade.enrollment_id == null) {
      continue;
    }
    const uid = uidByEnrollmentId.get(String(grade.enrollment_id));
    if (uid) {
      gradesByUid.set(uid, grade);
    }
  }

  const submissionsByUid = new Map<string, SchoologySubmission>();

  for (const revision of normalizeApiArray(submissionsData.revision)) {
    if (revision.uid == null || revision.draft) {
      continue;
    }

    const uid = String(revision.uid);
    const existing = submissionsByUid.get(uid);
    const created = revision.created ?? 0;
    const existingCreated = existing?.submittedAt
      ? Date.parse(existing.submittedAt) / 1000
      : 0;

    if (existing && created <= existingCreated) {
      continue;
    }

    const gradeEntry = gradesByUid.get(uid);
    const formattedGrade = gradeEntry
      ? formatGrade(gradeEntry, scaleMap, assignmentScaleId, letterScaleLevels)
      : undefined;
    const files = parseSubmissionFiles(revision);

    submissionsByUid.set(uid, {
      userId: uid,
      studentName: namesByUid.get(uid),
      score: formattedGrade?.score,
      gradeLetter: formattedGrade?.gradeLetter,
      submittedAt: formatTimestamp(revision.created),
      late: revision.late === 1,
      draft: revision.draft === 1,
      status: revision.draft
        ? "Draft"
        : revision.late
          ? "Late"
          : files.length > 0
            ? "Submitted"
            : revision.body
              ? "Submitted"
              : undefined,
      body: revision.body?.trim() || undefined,
      files,
    });
  }

  return Array.from(submissionsByUid.values()).sort((a, b) => {
    const nameA = a.studentName ?? a.userId ?? "";
    const nameB = b.studentName ?? b.userId ?? "";
    return nameA.localeCompare(nameB);
  });
}
