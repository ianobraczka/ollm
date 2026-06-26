"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ASSESSMENT_TEXT, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  SchoologyAssignmentSummary,
  SchoologyCourseMaterialsResult,
} from "@/types/schoology";

type CourseMaterialsAccordionProps = {
  language: AppLanguage;
  courseName: string;
  materials: SchoologyCourseMaterialsResult | null;
  loading?: boolean;
  error?: string | null;
  onSelectAssignment: (assignment: SchoologyAssignmentSummary) => void;
};

export function CourseMaterialsAccordion({
  language,
  courseName,
  materials,
  loading = false,
  error = null,
  onSelectAssignment,
}: CourseMaterialsAccordionProps) {
  const t = ASSESSMENT_TEXT[language];
  const [open, setOpen] = React.useState(true);
  const [assignmentFilter, setAssignmentFilter] = React.useState<"ungraded" | "graded">(
    "ungraded",
  );

  const allAssignments = materials?.groups.flatMap((group) => group.assignments) ?? [];
  const filteredAssignments = allAssignments.filter((assignment) =>
    assignmentFilter === "graded" ? assignment.isFullyGraded : !assignment.isFullyGraded,
  );

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <div className="space-y-1">
          <CardTitle className="text-base">{t.courseMaterialsTitle}</CardTitle>
          <CardDescription>
            {materials
              ? t.courseMaterialsCount(allAssignments.length, courseName)
              : courseName}
          </CardDescription>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>

      {open && (
        <CardContent className="space-y-3 border-t border-border pt-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-md border border-border p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  assignmentFilter === "ungraded"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setAssignmentFilter("ungraded")}
              >
                {t.assignmentFilterUngraded}
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  assignmentFilter === "graded"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setAssignmentFilter("graded")}
              >
                {t.assignmentFilterGraded}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.courseMaterialsLoading}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : materials ? (
            filteredAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {allAssignments.length === 0
                  ? t.noAssignmentsInPeriod
                  : t.noAssignmentsForFilter}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {filteredAssignments.map((assignment) => (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAssignment(assignment)}
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <p className="text-sm font-medium">{assignment.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">ID {assignment.id}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
