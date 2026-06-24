"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { LessonMapLink } from "@/components/LessonMapLink";
import { ModeToggle } from "@/components/ModeToggle";
import { PageNavSelect } from "@/components/PageNavSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_TEXT, type AppLanguage } from "@/lib/i18n";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SchoologyCourse, SchoologySessionStatus } from "@/types/schoology";

type AssessmentAssistantSidebarProps = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  sessionStatus: SchoologySessionStatus | null;
  sessionLoading: boolean;
  courses: SchoologyCourse[];
  coursesLoading: boolean;
  coursesError: string | null;
  selectedCourseId: string | null;
  onSelectCourse: (course: SchoologyCourse) => void;
  onRefreshConnection: () => void;
  onLogout: () => void;
  locallyDisconnected?: boolean;
  actionsDisabled?: boolean;
};

function UserAvatar({
  name,
  pictureUrl,
}: {
  name?: string;
  pictureUrl?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const initials = name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (pictureUrl && !imageFailed) {
    return (
      <img
        src={pictureUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials || "?"}
    </div>
  );
}

export function AssessmentAssistantSidebar({
  language,
  onLanguageChange,
  sessionStatus,
  sessionLoading,
  courses,
  coursesLoading,
  coursesError,
  selectedCourseId,
  onSelectCourse,
  onRefreshConnection,
  onLogout,
  locallyDisconnected = false,
  actionsDisabled = false,
}: AssessmentAssistantSidebarProps) {
  const t = ASSESSMENT_TEXT[language];

  const sessionLabel = sessionLoading
    ? t.sessionChecking
    : sessionStatus?.hasSession
      ? t.sessionSaved
      : t.sessionNotLoggedIn;

  return (
    <aside className="flex h-auto max-h-[45vh] w-full shrink-0 flex-col gap-4 overflow-hidden border-r border-border bg-background p-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-screen lg:max-h-none lg:w-[calc(var(--spacing)*100)]">
      <div className="space-y-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
        </div>
        <PageNavSelect language={language} />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {sessionStatus?.hasSession && sessionStatus.user ? (
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  name={sessionStatus.user.name}
                  pictureUrl={sessionStatus.user.pictureUrl}
                />
                {sessionStatus.user.name && (
                  <p className="text-sm font-medium leading-tight">{sessionStatus.user.name}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.sessionNotLoggedIn}</p>
            )}
          </div>
          <Badge
            variant={sessionStatus?.hasSession ? "success" : "secondary"}
            className="shrink-0 gap-1.5"
          >
            {sessionLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : sessionStatus?.hasSession ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            <span className="max-w-[8rem] truncate">{sessionLabel}</span>
          </Badge>
        </div>

        {sessionStatus?.hasSession && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onLogout}
            disabled={sessionLoading || actionsDisabled}
          >
            <LogOut className="h-4 w-4" />
            {t.logout}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t.myCourses}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onRefreshConnection}
            disabled={sessionLoading || coursesLoading || actionsDisabled}
            aria-label={t.refreshCourses}
          >
            <RefreshCw
              className={cn("h-4 w-4", (sessionLoading || coursesLoading) && "animate-spin")}
            />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          {!sessionStatus?.hasSession && !sessionLoading ? (
            <p
              className={cn(
                "p-3 text-xs",
                sessionStatus?.error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {sessionStatus?.error
                ? sessionStatus.error
                : locallyDisconnected
                  ? t.coursesReconnectHint
                  : t.coursesLoginHint}
            </p>
          ) : coursesLoading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.coursesLoading}
            </div>
          ) : coursesError ? (
            <p className="p-3 text-xs text-destructive">{coursesError}</p>
          ) : courses.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">{t.noCourses}</p>
          ) : (
            <ul className="divide-y divide-border">
              {courses.map((course) => {
                const selected = selectedCourseId === course.id;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                        selected && "bg-accent font-medium",
                      )}
                    >
                      <span className="line-clamp-2 leading-snug">
                        {course.courseTitle &&
                        course.sectionTitle &&
                        course.courseTitle !== course.sectionTitle ? (
                          <>
                            <span className="block">{course.courseTitle}</span>
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                              {course.sectionTitle}
                            </span>
                          </>
                        ) : (
                          course.name
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-auto flex w-full items-center justify-between pt-2">
        <LanguageSelect value={language} onChange={onLanguageChange} />
        <div className="flex items-center gap-2">
          <LessonMapLink language={language} />
          <ModeToggle language={language} />
        </div>
      </div>
    </aside>
  );
}
