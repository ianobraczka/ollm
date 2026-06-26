"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ASSESSMENT_TEXT, type AppLanguage } from "@/lib/i18n";
import { buildStudentListSummaries } from "@/lib/studentGradebook";
import { cn } from "@/lib/utils";
import type { CourseSnapshot, CourseSnapshotStudent } from "@/types/schoology";

type CourseStudentsAccordionProps = {
  language: AppLanguage;
  snapshot: CourseSnapshot | null;
  loading?: boolean;
  error?: string | null;
  onSelectStudent: (student: CourseSnapshotStudent) => void;
};

export function CourseStudentsAccordion({
  language,
  snapshot,
  loading = false,
  error = null,
  onSelectStudent,
}: CourseStudentsAccordionProps) {
  const t = ASSESSMENT_TEXT[language];
  const [open, setOpen] = React.useState(true);
  const summaries = snapshot ? buildStudentListSummaries(snapshot) : [];

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <div className="space-y-1">
          <CardTitle className="text-base">{t.courseStudentsTitle}</CardTitle>
          <CardDescription>
            {snapshot
              ? t.courseStudentsCount(summaries.length)
              : t.courseStudentsDescription}
          </CardDescription>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {open && (
        <CardContent className="border-t border-border pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.courseStudentsLoading}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noStudentsInCourse}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {summaries.map((student) => (
                <li key={student.uid}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectStudent({ uid: student.uid, name: student.name })
                    }
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.studentListMeta(
                          student.missingCount,
                          student.lateCount,
                          student.averageScorePercent,
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "missing":
      return "bg-destructive/10 text-destructive";
    case "late":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "excused":
    case "incomplete":
      return "bg-muted text-muted-foreground";
    case "graded":
      return "bg-primary/10 text-primary";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        statusBadgeClass(status),
      )}
    >
      {label}
    </span>
  );
}
