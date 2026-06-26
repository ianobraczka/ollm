"use client";

import * as React from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/CourseStudentsAccordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSESSMENT_TEXT } from "@/lib/i18n";
import {
  buildStudentGradebookRows,
  formatSubmissionStatusLabel,
} from "@/lib/studentGradebook";
import { cn } from "@/lib/utils";
import type {
  CourseSnapshot,
  CourseSnapshotStudent,
  CourseSnapshotSubmissionStatus,
} from "@/types/schoology";

type StudentDetailViewProps = {
  student: CourseSnapshotStudent;
  courseName: string;
  snapshot: CourseSnapshot;
  onBack: () => void;
  onSelectAssignment?: (assignmentId: string, title: string) => void;
  t: (typeof ASSESSMENT_TEXT)[keyof typeof ASSESSMENT_TEXT];
};

function submissionStatusLabels(
  t: (typeof ASSESSMENT_TEXT)[keyof typeof ASSESSMENT_TEXT],
): Record<CourseSnapshotSubmissionStatus, string> {
  return {
    missing: t.statusMissing,
    submitted: t.statusSubmitted,
    late: t.statusLate,
    excused: t.statusExcused,
    incomplete: t.statusIncomplete,
    graded: t.statusGraded,
  };
}

export function StudentDetailView({
  student,
  courseName,
  snapshot,
  onBack,
  onSelectAssignment,
  t,
}: StudentDetailViewProps) {
  const [statusFilter, setStatusFilter] = React.useState<"all" | CourseSnapshotSubmissionStatus>(
    "all",
  );
  const statusLabels = submissionStatusLabels(t);
  const rows = buildStudentGradebookRows(snapshot, student.uid);

  const missingCount = rows.filter((row) => row.status === "missing").length;
  const lateCount = rows.filter((row) => row.status === "late").length;
  const gradedScores = rows
    .map((row) => row.scorePercent)
    .filter((score): score is number => score != null);
  const averageScorePercent =
    gradedScores.length > 0
      ? Math.round(
          (gradedScores.reduce((sum, score) => sum + score, 0) / gradedScores.length) * 10,
        ) / 10
      : undefined;

  const filteredRows =
    statusFilter === "all" ? rows : rows.filter((row) => row.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t.backToCourse}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{student.name}</CardTitle>
          <CardDescription>{courseName}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t.studentMissingCountLabel}</dt>
              <dd className="mt-0.5 font-medium">{missingCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.studentLateCountLabel}</dt>
              <dd className="mt-0.5 font-medium">{lateCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.studentAverageGradeLabel}</dt>
              <dd className="mt-0.5 font-medium">
                {averageScorePercent != null ? `${averageScorePercent}%` : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{t.studentGradebookTitle}</CardTitle>
              <CardDescription>{t.studentGradebookDescription}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all", "missing", "late", "graded", "submitted"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors",
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all" ? t.studentFilterAll : statusLabels[filter]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.studentNoRowsForFilter}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {filteredRows.map((row) => (
                <li key={row.assignmentId}>
                  <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      {onSelectAssignment ? (
                        <button
                          type="button"
                          onClick={() => onSelectAssignment(row.assignmentId, row.title)}
                          className="text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {row.title}
                        </button>
                      ) : (
                        <p className="text-sm font-medium">{row.title}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{row.categoryName}</span>
                        {row.dueDate && <span>{row.dueDate}</span>}
                        {row.maxPoints != null && (
                          <span>
                            {t.colPoints}: {row.maxPoints}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <StatusBadge
                          status={row.status}
                          label={formatSubmissionStatusLabel(row.status, statusLabels)}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {(row.gradeLetter || row.scoreDisplay) && (
                        <div className="text-right">
                          {row.gradeLetter ? (
                            <p className="text-xl font-semibold leading-none">{row.gradeLetter}</p>
                          ) : null}
                          {row.scoreDisplay ? (
                            <p
                              className={cn(
                                "text-muted-foreground",
                                row.gradeLetter ? "mt-1 text-xs" : "text-sm font-medium",
                              )}
                            >
                              {row.scoreDisplay}
                            </p>
                          ) : null}
                        </div>
                      )}
                      {row.url && (
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                          <a href={row.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t.openInSchoology}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
