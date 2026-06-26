"use client";

import * as React from "react";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Loader2, Paperclip } from "lucide-react";

import { CourseChatSidebar } from "@/components/CourseChatSidebar";
import { AssessmentAssistantSidebar } from "@/components/AssessmentAssistantSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/apiClient";
import { ASSESSMENT_TEXT } from "@/lib/i18n";
import { useAppLanguage } from "@/lib/useAppLanguage";
import { cn } from "@/lib/utils";
import type {
  SchoologyAssessmentData,
  SchoologyAssignmentSummary,
  SchoologyCourse,
  SchoologyCourseMaterialsResult,
  SchoologyCoursesResult,
  SchoologySessionStatus,
  SchoologySubmission,
  SchoologyRubric,
} from "@/types/schoology";

const SCHOOLOGY_DISCONNECTED_STORAGE_KEY = "ollm-schoology-disconnected";

function formatSavedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatFileSize(bytes?: number): string | undefined {
  if (bytes == null || bytes <= 0) {
    return undefined;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssessmentAssistantPage() {
  const [language, setLanguage] = useAppLanguage();
  const t = ASSESSMENT_TEXT[language];
  const locale = language === "pt-BR" ? "pt-BR" : "en-US";

  const [sessionStatus, setSessionStatus] = React.useState<SchoologySessionStatus | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [retrieveLoading, setRetrieveLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assessment, setAssessment] = React.useState<SchoologyAssessmentData | null>(null);

  const [courses, setCourses] = React.useState<SchoologyCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = React.useState(false);
  const [coursesError, setCoursesError] = React.useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<SchoologyCourse | null>(null);
  const [courseMaterials, setCourseMaterials] = React.useState<SchoologyCourseMaterialsResult | null>(
    null,
  );
  const [materialsLoading, setMaterialsLoading] = React.useState(false);
  const [materialsError, setMaterialsError] = React.useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = React.useState<SchoologyAssignmentSummary | null>(
    null,
  );
  const [assignmentFilter, setAssignmentFilter] = React.useState<"ungraded" | "graded">("ungraded");
  const [locallyDisconnected, setLocallyDisconnected] = React.useState(false);

  const refreshSession = React.useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await fetch("/api/assessment-assistant/session");
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const fallback = {
          hasSession: false,
          error: t.sessionApiUnavailable,
        };
        setSessionStatus(fallback);
        return fallback;
      }

      const data = (await res.json()) as SchoologySessionStatus;
      if (!res.ok && !data.error) {
        data.error = t.sessionExpired;
      }
      setSessionStatus(data);
      return data;
    } catch {
      const fallback = { hasSession: false, error: t.sessionApiUnavailable };
      setSessionStatus(fallback);
      return fallback;
    } finally {
      setSessionLoading(false);
    }
  }, [t.sessionApiUnavailable, t.sessionExpired]);

  const refreshCourses = React.useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const res = await fetch("/api/assessment-assistant/courses");
      if (res.status === 401) {
        setSessionStatus({ hasSession: false });
        setCourses([]);
        throw new Error(await getErrorMessage(res, t.sessionExpired));
      }
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, t.coursesLoadFailed));
      }
      const data = (await res.json()) as SchoologyCoursesResult;
      setCourses(data.courses);
      if (data.user) {
        setSessionStatus((prev) =>
          prev?.hasSession ? { ...prev, user: data.user } : prev,
        );
      }
    } catch (err) {
      setCourses([]);
      setCoursesError(err instanceof Error ? err.message : t.coursesLoadFailed);
    } finally {
      setCoursesLoading(false);
    }
  }, [t.coursesLoadFailed, t.sessionExpired]);

  const loadCourseMaterials = React.useCallback(
    async (course: SchoologyCourse) => {
      setMaterialsLoading(true);
      setMaterialsError(null);
      setCourseMaterials(null);
      setAssessment(null);
      setSelectedAssignment(null);
      setError(null);

      try {
        const res = await fetch(
          `/api/assessment-assistant/materials?sectionId=${encodeURIComponent(course.id)}`,
        );
        if (res.status === 401) {
          setSessionStatus({ hasSession: false });
          setCourses([]);
          throw new Error(await getErrorMessage(res, t.sessionExpired));
        }
        if (!res.ok) {
          throw new Error(await getErrorMessage(res, t.courseMaterialsFailed));
        }
        const data = (await res.json()) as SchoologyCourseMaterialsResult;
        setCourseMaterials(data);
      } catch (err) {
        setMaterialsError(err instanceof Error ? err.message : t.courseMaterialsFailed);
      } finally {
        setMaterialsLoading(false);
      }
    },
    [t.courseMaterialsFailed, t.sessionExpired],
  );

  const loadAssignment = React.useCallback(
    async (assignment: SchoologyAssignmentSummary, course: SchoologyCourse) => {
      setSelectedAssignment(assignment);
      setAssessment(null);
      setError(null);
      setRetrieveLoading(true);

      try {
        const res = await fetch("/api/assessment-assistant/retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: course.id,
            assessmentId: assignment.id,
            materialType: "assignment",
          }),
        });

        if (res.status === 401) {
          setSessionStatus({ hasSession: false });
          setCourses([]);
          throw new Error(await getErrorMessage(res, t.sessionExpired));
        }

        if (!res.ok) {
          throw new Error(await getErrorMessage(res, t.retrieveFailed));
        }

        const payload = (await res.json()) as { data: SchoologyAssessmentData };
        setAssessment(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.retrieveFailed);
      } finally {
        setRetrieveLoading(false);
      }
    },
    [t.retrieveFailed, t.sessionExpired],
  );

  React.useEffect(() => {
    const disconnected = sessionStorage.getItem(SCHOOLOGY_DISCONNECTED_STORAGE_KEY) === "1";
    if (disconnected) {
      setLocallyDisconnected(true);
      setSessionStatus({ hasSession: false });
      setSessionLoading(false);
      return;
    }

    void refreshSession().then((status) => {
      if (status.hasSession) {
        void refreshCourses();
      }
    });
  }, [refreshSession, refreshCourses]);

  async function handleRefreshConnection() {
    sessionStorage.removeItem(SCHOOLOGY_DISCONNECTED_STORAGE_KEY);
    setLocallyDisconnected(false);
    setError(null);
    const status = await refreshSession();
    if (status.hasSession) {
      await refreshCourses();
    }
  }

  function handleLogout() {
    sessionStorage.setItem(SCHOOLOGY_DISCONNECTED_STORAGE_KEY, "1");
    setLocallyDisconnected(true);
    setSessionStatus({ hasSession: false });
    setCourses([]);
    setCoursesError(null);
    setSelectedCourse(null);
    setCourseMaterials(null);
    setSelectedAssignment(null);
    setAssessment(null);
    setError(null);
  }

  function handleSelectCourse(course: SchoologyCourse) {
    setSelectedCourse(course);
    setAssignmentFilter("ungraded");
    void loadCourseMaterials(course);
  }

  function handleBackToAssignments() {
    setSelectedAssignment(null);
    setAssessment(null);
    setError(null);
  }

  function matchesAssignmentFilter(isFullyGraded: boolean): boolean {
    return assignmentFilter === "graded" ? isFullyGraded : !isFullyGraded;
  }

  function handleSelectAssignment(assignment: SchoologyAssignmentSummary) {
    if (!selectedCourse) {
      return;
    }
    void loadAssignment(assignment, selectedCourse);
  }

  const showingAssignment = selectedAssignment != null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AssessmentAssistantSidebar
        language={language}
        onLanguageChange={setLanguage}
        sessionStatus={sessionStatus}
        sessionLoading={sessionLoading}
        courses={courses}
        coursesLoading={coursesLoading}
        coursesError={coursesError}
        selectedCourseId={selectedCourse?.id ?? null}
        onSelectCourse={handleSelectCourse}
        onRefreshConnection={() => void handleRefreshConnection()}
        onLogout={handleLogout}
        locallyDisconnected={locallyDisconnected}
        actionsDisabled={retrieveLoading}
      />

      <main className="min-h-screen min-w-0 px-5 py-8 lg:ml-[calc(var(--spacing)*100)] lg:mr-[calc(var(--spacing)*100)]">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t.pageDescription}</p>
          </header>

          {!selectedCourse ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t.selectCourseHint}
              </CardContent>
            </Card>
          ) : showingAssignment ? (
            <AssignmentDetailView
              assessment={assessment}
              assignment={selectedAssignment}
              courseName={selectedCourse.name}
              error={error}
              loading={retrieveLoading}
              locale={locale}
              onBack={handleBackToAssignments}
              t={t}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t.courseMaterialsTitle}</CardTitle>
                    <CardDescription>{selectedCourse.name}</CardDescription>
                  </div>
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
              </CardHeader>
              <CardContent>
                {materialsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.courseMaterialsLoading}
                  </div>
                ) : materialsError ? (
                  <p className="text-sm text-destructive">{materialsError}</p>
                ) : courseMaterials ? (
                  (() => {
                    const allAssignments = courseMaterials.groups.flatMap((group) => group.assignments);
                    const filteredAssignments = allAssignments.filter((assignment) =>
                      matchesAssignmentFilter(assignment.isFullyGraded),
                    );

                    return (
                      <div className="space-y-3">
                        {filteredAssignments.length === 0 ? (
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
                                  onClick={() => handleSelectAssignment(assignment)}
                                  className="w-full px-3 py-2.5 text-left transition-colors hover:bg-accent"
                                >
                                  <p className="text-sm font-medium">{assignment.title}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    ID {assignment.id}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()
                ) : null}
              </CardContent>
            </Card>
          )}

          {error && !showingAssignment && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-6 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <CourseChatSidebar
        language={language}
        snapshot={courseMaterials?.snapshot ?? null}
        courseName={selectedCourse?.name ?? ""}
        focusedAssignmentId={selectedAssignment?.id}
        focusedAssignmentTitle={selectedAssignment?.title ?? assessment?.title}
        materialsLoading={materialsLoading}
        onRefreshCourse={
          selectedCourse ? () => void loadCourseMaterials(selectedCourse) : undefined
        }
        refreshDisabled={retrieveLoading}
      />
    </div>
  );
}

function AssignmentDetailView({
  assessment,
  assignment,
  courseName,
  error,
  loading,
  locale,
  onBack,
  t,
}: {
  assessment: SchoologyAssessmentData | null;
  assignment: SchoologyAssignmentSummary;
  courseName: string;
  error: string | null;
  loading: boolean;
  locale: string;
  onBack: () => void;
  t: (typeof ASSESSMENT_TEXT)[keyof typeof ASSESSMENT_TEXT];
}) {
  const [submissionsOpen, setSubmissionsOpen] = React.useState(false);
  const [rubricOpen, setRubricOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t.backToAssignments}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.assignmentLoading}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : assessment ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>{assessment.title ?? assignment.title}</CardTitle>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={assessment.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t.openInSchoology}
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <SummaryField label={t.fieldAssessmentId} value={assessment.assessmentId} />
                <SummaryField label={t.fieldCourse} value={courseName} />
                <SummaryField label={t.fieldDueDate} value={assessment.dueDate} />
                <SummaryField label={t.fieldMaxPoints} value={assessment.maxPoints} />
                {assessment.description && (
                  <SummaryField
                    label={t.fieldDescription}
                    value={assessment.description}
                    className="sm:col-span-2"
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setSubmissionsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/40"
              aria-expanded={submissionsOpen}
            >
              <span className="text-base font-semibold">
                {assessment.submissions.length > 0
                  ? t.submissionsTitleCount(assessment.submissions.length)
                  : t.submissionsTitle}
              </span>
              {submissionsOpen ? (
                <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
            {submissionsOpen && (
              <CardContent className="border-t border-border pt-4">
                {assessment.submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noSubmissions}</p>
                ) : (
                  <ul className="space-y-4">
                    {assessment.submissions.map((submission) => (
                      <SubmissionCard
                        key={submission.userId ?? submission.studentName ?? submission.submittedAt}
                        submission={submission}
                        locale={locale}
                        t={t}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            )}
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setRubricOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-accent/40"
              aria-expanded={rubricOpen}
            >
              <span className="text-base font-semibold">{t.rubricsTitle}</span>
              {rubricOpen ? (
                <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
            {rubricOpen && (
              <CardContent className="border-t border-border pt-4">
                {!assessment.rubric ? (
                  <p className="text-sm text-muted-foreground">{t.noRubric}</p>
                ) : (
                  <RubricContent rubric={assessment.rubric} t={t} />
                )}
              </CardContent>
            )}
          </Card>

        </>
      ) : null}
    </div>
  );
}

function RubricContent({
  rubric,
  t,
}: {
  rubric: SchoologyRubric;
  t: (typeof ASSESSMENT_TEXT)[keyof typeof ASSESSMENT_TEXT];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{rubric.title}</p>
        {rubric.totalPoints && (
          <Badge variant="secondary">{t.rubricTotalPoints(rubric.totalPoints)}</Badge>
        )}
      </div>
      {rubric.criteria.map((criterion) => (
        <div
          key={criterion.id ?? criterion.title}
          className="rounded-lg border border-border p-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{criterion.title}</p>
            {criterion.description && (
              <p className="text-sm text-muted-foreground">{criterion.description}</p>
            )}
            {(criterion.maxPoints || criterion.weight) && (
              <p className="text-xs text-muted-foreground">
                {[
                  criterion.maxPoints && `${t.colPoints}: ${criterion.maxPoints}`,
                  criterion.weight && `Weight: ${criterion.weight}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {criterion.ratings.length > 0 && (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {criterion.ratings.map((rating, index) => (
                <li
                  key={`${criterion.id ?? criterion.title}-${index}`}
                  className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span>{rating.description ?? "—"}</span>
                  {rating.points != null && (
                    <span className="shrink-0 font-medium">{rating.points}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function SubmissionCard({
  submission,
  locale,
  t,
}: {
  submission: SchoologySubmission;
  locale: string;
  t: (typeof ASSESSMENT_TEXT)[keyof typeof ASSESSMENT_TEXT];
}) {
  const submittedLabel = submission.submittedAt
    ? formatSavedAt(submission.submittedAt, locale)
    : undefined;

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {submission.studentName ?? submission.userId ?? "—"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {submission.status && <span>{submission.status}</span>}
            {submission.late && (
              <Badge variant="secondary" className="text-[10px]">
                {t.lateLabel}
              </Badge>
            )}
            {submittedLabel && <span>{submittedLabel}</span>}
          </div>
        </div>
        {(submission.gradeLetter || submission.score) && (
          <div className="shrink-0 text-right">
            {submission.gradeLetter ? (
              <p className="text-2xl font-semibold leading-none tracking-tight">
                {submission.gradeLetter}
              </p>
            ) : null}
            {submission.score ? (
              <p
                className={cn(
                  "text-muted-foreground",
                  submission.gradeLetter ? "mt-1 text-xs" : "text-sm font-medium",
                )}
              >
                {submission.score}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {submission.body && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{submission.body}</p>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium text-muted-foreground">{t.submissionFiles}</p>
        {submission.files.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t.noSubmissionFiles}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {submission.files.map((file) => (
              <li key={`${file.id ?? file.filename}-${file.url ?? "local"}`}>
                {file.url ? (
                  <a
                    href={file.url}
                    download={file.filename}
                    className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span>{file.filename}</span>
                    {formatFileSize(file.filesize) && (
                      <span className="text-xs text-muted-foreground no-underline">
                        ({formatFileSize(file.filesize)})
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {file.filename}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function SummaryField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-all font-medium">{value?.trim() || "—"}</dd>
    </div>
  );
}
