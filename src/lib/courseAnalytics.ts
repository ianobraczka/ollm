import type { CourseQuestionClassification } from "@/lib/classifyCourseQuestion";
import { filterAssignmentsByTopic } from "@/lib/topicMatching";
import type {
  CourseSnapshot,
  CourseSnapshotAssignment,
  CourseSnapshotCell,
  CourseSnapshotSubmissionStatus,
} from "@/types/schoology";

export type BuildCourseAnalyticsOptions = {
  topicAssignmentIds?: string[];
};

export type CourseAnalyticsResult = {
  intent: string;
  computedAt: string;
  notes: string[];
  data: Record<string, unknown>;
};

type StudentStats = {
  uid: string;
  name: string;
  missingCount: number;
  lateCount: number;
  submittedCount: number;
  gradedCount: number;
  averageScorePercent?: number;
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

function getCell(
  map: Map<string, CourseSnapshotCell>,
  studentUid: string,
  assignmentId: string,
): CourseSnapshotCell | undefined {
  return map.get(cellKey(studentUid, assignmentId));
}

function isMissingStatus(status: CourseSnapshotSubmissionStatus): boolean {
  return status === "missing";
}

function hasScore(cell: CourseSnapshotCell | undefined): cell is CourseSnapshotCell & {
  scorePercent: number;
} {
  return cell?.scorePercent != null && Number.isFinite(cell.scorePercent);
}

function computeStudentStats(
  snapshot: CourseSnapshot,
  cellMap: Map<string, CourseSnapshotCell>,
): StudentStats[] {
  return snapshot.students.map((student) => {
    let missingCount = 0;
    let lateCount = 0;
    let submittedCount = 0;
    let gradedCount = 0;
    const scores: number[] = [];

    for (const assignment of snapshot.assignments) {
      const cell = getCell(cellMap, student.uid, assignment.id);
      if (!cell) {
        missingCount += 1;
        continue;
      }

      if (isMissingStatus(cell.status)) {
        missingCount += 1;
      } else {
        submittedCount += 1;
      }

      if (cell.status === "late") {
        lateCount += 1;
      }

      if (cell.status === "graded" || hasScore(cell)) {
        gradedCount += 1;
      }

      if (hasScore(cell)) {
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
      submittedCount,
      gradedCount,
      averageScorePercent,
    };
  });
}

function averageForAssignments(
  studentUid: string,
  assignments: CourseSnapshotAssignment[],
  cellMap: Map<string, CourseSnapshotCell>,
): number | undefined {
  const scores: number[] = [];

  for (const assignment of assignments) {
    const cell = getCell(cellMap, studentUid, assignment.id);
    if (hasScore(cell)) {
      scores.push(cell.scorePercent);
    }
  }

  if (scores.length === 0) {
    return undefined;
  }

  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

function buildCategoryPerformance(
  snapshot: CourseSnapshot,
  cellMap: Map<string, CourseSnapshotCell>,
  categoryName?: string,
) {
  const categories = categoryName
    ? snapshot.categories.filter(
        (category) => category.toLowerCase() === categoryName.toLowerCase(),
      )
    : snapshot.categories;

  return categories.map((category) => {
    const assignments = snapshot.assignments.filter(
      (assignment) => assignment.categoryName === category,
    );

    const studentRows = snapshot.students
      .map((student) => {
        const averageScorePercent = averageForAssignments(student.uid, assignments, cellMap);
        const missingCount = assignments.filter((assignment) => {
          const cell = getCell(cellMap, student.uid, assignment.id);
          return !cell || isMissingStatus(cell.status);
        }).length;

        return {
          studentUid: student.uid,
          studentName: student.name,
          averageScorePercent,
          missingCount,
          assignmentCount: assignments.length,
        };
      })
      .sort((a, b) => {
        const scoreA = a.averageScorePercent ?? 101;
        const scoreB = b.averageScorePercent ?? 101;
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        return b.missingCount - a.missingCount;
      });

    const classScores = studentRows
      .map((row) => row.averageScorePercent)
      .filter((score): score is number => score != null);

    const classAverage =
      classScores.length > 0
        ? Math.round(
            (classScores.reduce((sum, score) => sum + score, 0) / classScores.length) * 10,
          ) / 10
        : undefined;

    return {
      categoryName: category,
      assignmentCount: assignments.length,
      classAverageScorePercent: classAverage,
      students: studentRows,
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
      })),
    };
  });
}

function buildPeriodPerformance(
  snapshot: CourseSnapshot,
  cellMap: Map<string, CourseSnapshotCell>,
  studentUid: string,
  requestedPeriods?: string[],
) {
  const availablePeriods = [
    ...(snapshot.gradingPeriods ?? []),
    ...snapshot.assignments
      .map((assignment) => assignment.gradingPeriod)
      .filter((period): period is string => Boolean(period)),
  ];
  const uniqueAvailable = [...new Set(availablePeriods)];

  const periodsToReport =
    requestedPeriods && requestedPeriods.length > 0
      ? requestedPeriods
      : uniqueAvailable;

  if (periodsToReport.length === 0) {
    return {
      periodPerformance: [],
      periodComparisonNote:
        "No grading-period labels are available on assignments in this course snapshot, so quarter comparison cannot be computed yet.",
    };
  }

  const periodPerformance = periodsToReport.map((period) => {
    const periodAssignments = snapshot.assignments.filter((assignment) => {
      if (assignment.gradingPeriod) {
        return assignment.gradingPeriod.toLowerCase() === period.toLowerCase();
      }
      // Soft fallback: category name mentions the period title.
      return assignment.categoryName.toLowerCase().includes(period.toLowerCase());
    });

    const scores: number[] = [];
    let missingCount = 0;
    let gradedCount = 0;

    for (const assignment of periodAssignments) {
      const cell = getCell(cellMap, studentUid, assignment.id);
      if (!cell || isMissingStatus(cell.status)) {
        missingCount += 1;
        continue;
      }
      if (hasScore(cell)) {
        scores.push(cell.scorePercent);
        gradedCount += 1;
      }
    }

    const averageScorePercent =
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : undefined;

    return {
      gradingPeriod: period,
      assignmentCount: periodAssignments.length,
      gradedCount,
      missingCount,
      averageScorePercent,
      assignments: periodAssignments.map((assignment) => {
        const cell = getCell(cellMap, studentUid, assignment.id);
        return {
          assignmentId: assignment.id,
          title: assignment.title,
          status: cell?.status ?? "missing",
          scorePercent: cell?.scorePercent,
          gradeLetter: cell?.gradeLetter,
          scoreDisplay: cell?.scoreDisplay,
        };
      }),
    };
  });

  const scoredPeriods = periodPerformance.filter(
    (period) => period.averageScorePercent != null,
  );
  const periodComparison =
    scoredPeriods.length >= 2
      ? scoredPeriods.map((period, index, list) => {
          const previous = index > 0 ? list[index - 1] : undefined;
          const deltaFromPrevious =
            previous?.averageScorePercent != null && period.averageScorePercent != null
              ? Math.round((period.averageScorePercent - previous.averageScorePercent) * 10) / 10
              : undefined;
          return {
            gradingPeriod: period.gradingPeriod,
            averageScorePercent: period.averageScorePercent,
            deltaFromPrevious,
          };
        })
      : undefined;

  const matchedAssignmentCount = periodPerformance.reduce(
    (sum, period) => sum + period.assignmentCount,
    0,
  );

  return {
    periodPerformance,
    periodComparison,
    periodComparisonNote:
      matchedAssignmentCount === 0
        ? "Requested grading periods were found in the question, but no assignments in this snapshot are tagged with those periods. Ask the teacher to verify Schoology grading-period setup."
        : scoredPeriods.length >= 2
          ? "Compare averageScorePercent across periodPerformance / periodComparison. Positive deltaFromPrevious means improvement vs the previous listed period."
          : undefined,
  };
}

function buildStudentProfile(
  snapshot: CourseSnapshot,
  cellMap: Map<string, CourseSnapshotCell>,
  studentUid: string,
  categoryName?: string,
  topic?: string,
  topicAssignmentIds?: string[],
  gradingPeriods?: string[],
) {
  const student = snapshot.students.find((entry) => entry.uid === studentUid);
  if (!student) {
    return { error: "Student not found in course roster." };
  }

  const stats = computeStudentStats(snapshot, cellMap).find((entry) => entry.uid === studentUid);
  const categories = buildCategoryPerformance(snapshot, cellMap).map((category) => {
    const row = category.students.find((entry) => entry.studentUid === studentUid);
    return {
      categoryName: category.categoryName,
      averageScorePercent: row?.averageScorePercent,
      missingCount: row?.missingCount ?? 0,
      assignmentCount: row?.assignmentCount ?? 0,
      classAverageScorePercent: category.classAverageScorePercent,
    };
  });

  let scopedAssignments = categoryName
    ? snapshot.assignments.filter(
        (assignment) => assignment.categoryName.toLowerCase() === categoryName.toLowerCase(),
      )
    : snapshot.assignments;

  if (topic) {
    if (topicAssignmentIds && topicAssignmentIds.length > 0) {
      scopedAssignments = scopedAssignments.filter((assignment) =>
        topicAssignmentIds.includes(assignment.id),
      );
    } else {
      const topicMatches = filterAssignmentsByTopic(scopedAssignments, topic);
      if (topicMatches.length > 0) {
        scopedAssignments = topicMatches;
      }
    }
  }

  // When the teacher asks about specific quarters, focus breakdown on those periods.
  if (gradingPeriods && gradingPeriods.length > 0) {
    const periodScoped = scopedAssignments.filter((assignment) =>
      gradingPeriods.some((period) => {
        if (assignment.gradingPeriod?.toLowerCase() === period.toLowerCase()) {
          return true;
        }
        return assignment.categoryName.toLowerCase().includes(period.toLowerCase());
      }),
    );
    if (periodScoped.length > 0) {
      scopedAssignments = periodScoped;
    }
  }

  const assignmentBreakdown = scopedAssignments
    .map((assignment) => {
      const cell = getCell(cellMap, studentUid, assignment.id);
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        categoryName: assignment.categoryName,
        gradingPeriod: assignment.gradingPeriod,
        status: cell?.status ?? "missing",
        scorePercent: cell?.scorePercent,
        gradeLetter: cell?.gradeLetter,
        scoreDisplay: cell?.scoreDisplay,
      };
    })
    .sort((a, b) => {
      const scoreA = a.scorePercent ?? 101;
      const scoreB = b.scorePercent ?? 101;
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      if (a.status === "missing" && b.status !== "missing") {
        return -1;
      }
      if (b.status === "missing" && a.status !== "missing") {
        return 1;
      }
      return a.title.localeCompare(b.title);
    });

  const lowestScored = assignmentBreakdown
    .filter((entry) => entry.scorePercent != null)
    .slice(0, 5);
  const missingAssignments = assignmentBreakdown
    .filter((entry) => entry.status === "missing")
    .slice(0, 10);

  const weakCategories = categories
    .filter((category) => {
      if (category.averageScorePercent == null || category.classAverageScorePercent == null) {
        return category.missingCount > 0;
      }
      return category.averageScorePercent < category.classAverageScorePercent - 10;
    })
    .map((category) => category.categoryName);

  const topicScores = assignmentBreakdown
    .map((entry) => entry.scorePercent)
    .filter((score): score is number => score != null);
  const topicAverageScorePercent =
    topic && topicScores.length > 0
      ? Math.round((topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length) * 10) /
        10
      : undefined;

  const periodAnalytics = buildPeriodPerformance(
    snapshot,
    cellMap,
    studentUid,
    gradingPeriods,
  );

  return {
    studentUid: student.uid,
    studentName: student.name,
    stats,
    categories,
    weakCategories,
    lowestScoredAssignments: lowestScored,
    missingAssignments,
    focusedCategory: categoryName,
    focusedTopic: topic,
    focusedGradingPeriods: gradingPeriods,
    topicAssignments: topic ? assignmentBreakdown : undefined,
    topicAverageScorePercent: topic ? topicAverageScorePercent : undefined,
    topicGradedCount: topic ? topicScores.length : undefined,
    topicMissingCount: topic
      ? assignmentBreakdown.filter((entry) => entry.status === "missing").length
      : undefined,
    ...periodAnalytics,
  };
}

export function buildCourseAnalytics(
  snapshot: CourseSnapshot,
  classification: CourseQuestionClassification,
  options: BuildCourseAnalyticsOptions = {},
): CourseAnalyticsResult {
  const { topicAssignmentIds } = options;
  const cellMap = buildCellMap(snapshot.cells);
  const studentStats = computeStudentStats(snapshot, cellMap);
  const notes: string[] = [
    "All counts and averages below were computed from the course snapshot. Do not invent numbers.",
  ];

  switch (classification.intent) {
    case "aggregate_missing": {
      const threshold = classification.missingThreshold ?? 1;
      const rows = studentStats
        .filter((student) => student.missingCount >= threshold)
        .sort((a, b) => b.missingCount - a.missingCount);

      if (classification.studentUid) {
        const student = studentStats.find((entry) => entry.uid === classification.studentUid);
        return {
          intent: classification.intent,
          computedAt: new Date().toISOString(),
          notes,
          data: {
            threshold,
            student,
            totalAssignments: snapshot.assignments.length,
          },
        };
      }

      return {
        intent: classification.intent,
        computedAt: new Date().toISOString(),
        notes,
        data: {
          threshold,
          students: rows,
          totalStudents: snapshot.students.length,
          totalAssignments: snapshot.assignments.length,
        },
      };
    }

    case "student_profile": {
      if (!classification.studentUid) {
        return {
          intent: classification.intent,
          computedAt: new Date().toISOString(),
          notes: [...notes, "No student name was detected. Ask the teacher to name a student."],
          data: { error: "student_not_specified" },
        };
      }

      return {
        intent: classification.intent,
        computedAt: new Date().toISOString(),
        notes,
        data: buildStudentProfile(
          snapshot,
          cellMap,
          classification.studentUid,
          classification.categoryName,
          classification.topic,
          topicAssignmentIds,
          classification.gradingPeriods,
        ),
      };
    }

    case "category_performance": {
      const categories = buildCategoryPerformance(
        snapshot,
        cellMap,
        classification.categoryName,
      );

      return {
        intent: classification.intent,
        computedAt: new Date().toISOString(),
        notes,
        data: {
          categories,
          focusedCategory: classification.categoryName,
        },
      };
    }

    case "topic_performance": {
      const topic = classification.topic ?? "";
      const matchedAssignments =
        topicAssignmentIds && topicAssignmentIds.length > 0
          ? snapshot.assignments.filter((assignment) => topicAssignmentIds.includes(assignment.id))
          : filterAssignmentsByTopic(snapshot.assignments, topic);

      if (matchedAssignments.length === 0) {
        return {
          intent: classification.intent,
          computedAt: new Date().toISOString(),
          notes: [
            ...notes,
            `No assignments matched topic "${topic}". Do not guess; ask the teacher to clarify or pick assignments.`,
          ],
          data: {
            topic,
            matchedAssignments: [],
            students: [],
          },
        };
      }

      const students = snapshot.students
        .map((student) => {
          const assignmentScores = matchedAssignments.map((assignment) => {
            const cell = getCell(cellMap, student.uid, assignment.id);
            return {
              assignmentId: assignment.id,
              title: assignment.title,
              status: cell?.status ?? "missing",
              scorePercent: cell?.scorePercent,
              gradeLetter: cell?.gradeLetter,
              scoreDisplay: cell?.scoreDisplay,
            };
          });
          const averageScorePercent = averageForAssignments(
            student.uid,
            matchedAssignments,
            cellMap,
          );
          const missingCount = assignmentScores.filter(
            (entry) => !entry.scorePercent && isMissingStatus(entry.status),
          ).length;

          return {
            studentUid: student.uid,
            studentName: student.name,
            averageScorePercent,
            missingCount,
            assignmentScores,
          };
        })
        .sort((a, b) => {
          const scoreA = a.averageScorePercent ?? -1;
          const scoreB = b.averageScorePercent ?? -1;
          // Highest topic average first (best performers at the top).
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return a.missingCount - b.missingCount;
        });

      const gradedStudents = students.filter((student) => student.averageScorePercent != null);

      return {
        intent: classification.intent,
        computedAt: new Date().toISOString(),
        notes: [
          ...notes,
          "Students are ranked by average score on matched topic assignments (best first). Use assignmentScores for per-assignment evidence.",
        ],
        data: {
          topic,
          matchedAssignments: matchedAssignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            categoryName: assignment.categoryName,
          })),
          topStudents: gradedStudents.slice(0, 5),
          bottomStudents: [...gradedStudents].reverse().slice(0, 5),
          students,
        },
      };
    }

    case "assignment_deep_dive": {
      if (classification.studentUid) {
        return {
          intent: classification.intent,
          computedAt: new Date().toISOString(),
          notes: [
            ...notes,
            "Detailed rubric/submission context may appear under FOCUSED ASSIGNMENT.",
          ],
          data: buildStudentProfile(
            snapshot,
            cellMap,
            classification.studentUid,
            classification.categoryName,
            classification.topic,
            topicAssignmentIds,
            classification.gradingPeriods,
          ),
        };
      }

      return {
        intent: classification.intent,
        computedAt: new Date().toISOString(),
        notes,
        data: {
          courseName: snapshot.courseName,
          totalStudents: snapshot.students.length,
          totalAssignments: snapshot.assignments.length,
        },
      };
    }

    case "course_overview":
    default: {
      const rankedByMissing = [...studentStats].sort((a, b) => b.missingCount - a.missingCount);
      const rankedByScore = [...studentStats]
        .filter((student) => student.averageScorePercent != null)
        .sort((a, b) => (a.averageScorePercent ?? 0) - (b.averageScorePercent ?? 0));

      return {
        intent: "course_overview",
        computedAt: new Date().toISOString(),
        notes,
        data: {
          courseName: snapshot.courseName,
          totalStudents: snapshot.students.length,
          totalAssignments: snapshot.assignments.length,
          categories: buildCategoryPerformance(snapshot, cellMap),
          studentsWithMostMissing: rankedByMissing.slice(0, 10),
          studentsWithLowestAverages: rankedByScore.slice(0, 10),
        },
      };
    }
  }
}

export function serializeCourseAnalytics(analytics: CourseAnalyticsResult): string {
  return JSON.stringify(analytics, null, 2);
}
