import type {
  CourseSnapshot,
  CourseSnapshotCell,
  CourseSnapshotStudent,
  CourseSnapshotSubmissionStatus,
} from "@/types/schoology";

export type StudentListSummary = {
  uid: string;
  name: string;
  missingCount: number;
  lateCount: number;
  averageScorePercent?: number;
};

export type StudentGradebookRow = {
  assignmentId: string;
  title: string;
  categoryName: string;
  dueDate?: string;
  maxPoints?: number;
  url?: string;
  status: CourseSnapshotSubmissionStatus;
  scorePercent?: number;
  gradeLetter?: string;
  scoreDisplay?: string;
};

function cellKey(studentUid: string, assignmentId: string): string {
  return `${studentUid}:${assignmentId}`;
}

function buildCellMap(cells: CourseSnapshotCell[]): Map<string, CourseSnapshotCell> {
  const map = new Map<string, CourseSnapshotCell>();
  for (const cell of cells) {
    map.set(cellKey(cell.studentUid, cell.assignmentId), cell);
  }
  return map;
}

export function buildStudentListSummaries(snapshot: CourseSnapshot): StudentListSummary[] {
  const cellMap = buildCellMap(snapshot.cells);

  return snapshot.students.map((student) => {
    let missingCount = 0;
    let lateCount = 0;
    const scores: number[] = [];

    for (const assignment of snapshot.assignments) {
      const cell = cellMap.get(cellKey(student.uid, assignment.id));
      if (!cell || cell.status === "missing") {
        missingCount += 1;
      }
      if (cell?.status === "late") {
        lateCount += 1;
      }
      if (cell?.scorePercent != null && Number.isFinite(cell.scorePercent)) {
        scores.push(cell.scorePercent);
      }
    }

    const averageScorePercent =
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : undefined;

    return {
      uid: student.uid,
      name: student.name,
      missingCount,
      lateCount,
      averageScorePercent,
    };
  });
}

export function findSnapshotStudent(
  snapshot: CourseSnapshot,
  studentUid: string,
): CourseSnapshotStudent | undefined {
  return snapshot.students.find((student) => student.uid === studentUid);
}

export function buildStudentGradebookRows(
  snapshot: CourseSnapshot,
  studentUid: string,
): StudentGradebookRow[] {
  const cellMap = buildCellMap(snapshot.cells);

  return snapshot.assignments.map((assignment) => {
    const cell = cellMap.get(cellKey(studentUid, assignment.id));
    return {
      assignmentId: assignment.id,
      title: assignment.title,
      categoryName: assignment.categoryName,
      dueDate: assignment.dueDate,
      maxPoints: assignment.maxPoints,
      url: assignment.url,
      status: cell?.status ?? "missing",
      scorePercent: cell?.scorePercent,
      gradeLetter: cell?.gradeLetter,
      scoreDisplay: cell?.scoreDisplay,
    };
  });
}

export function formatSubmissionStatusLabel(
  status: CourseSnapshotSubmissionStatus,
  labels: Record<CourseSnapshotSubmissionStatus, string>,
): string {
  return labels[status] ?? status;
}
