"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { ChatComposer } from "@/components/ChatComposer";
import { MessageBubble } from "@/components/MessageBubble";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/apiClient";
import { ASSESSMENT_TEXT, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CourseSnapshot } from "@/types/schoology";
import type { ChatMessage } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

type CourseChatSidebarProps = {
  language: AppLanguage;
  snapshot: CourseSnapshot | null;
  courseName: string;
  focusedAssignmentId?: string | null;
  focusedAssignmentTitle?: string | null;
  focusedStudentName?: string | null;
  materialsLoading?: boolean;
  onRefreshCourse?: () => void;
  refreshDisabled?: boolean;
};

export function CourseChatSidebar({
  language,
  snapshot,
  courseName,
  focusedAssignmentId,
  focusedAssignmentTitle,
  focusedStudentName,
  materialsLoading = false,
  onRefreshCourse,
  refreshDisabled = false,
}: CourseChatSidebarProps) {
  const t = ASSESSMENT_TEXT[language];
  const locale = language === "pt-BR" ? "pt-BR" : "en-US";
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, [snapshot?.sectionId]);

  const streamingId = isLoading
    ? messages.filter((m) => m.role === "assistant").at(-1)?.id
    : undefined;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function handleSend(content: string) {
    if (!snapshot) {
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = { id: createId(), role: "user", content };
    const assistantId = createId();
    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/assessment-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          snapshot,
          courseName,
          focusedAssignmentId: focusedAssignmentId ?? undefined,
          responseLanguage: language,
        }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, t.courseChatFailed));
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new Error(t.courseChatStreamError);
      }

      if (!res.body) {
        throw new Error(t.courseChatStreamError);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshotText = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshotText } : m)),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.courseChatFailed;
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !snapshot) return;
    setInput("");
    await handleSend(trimmed);
  }

  const extractedLabel = snapshot?.extractedAt
    ? t.courseChatDataUpdated(
        new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(snapshot.extractedAt)),
      )
    : null;

  return (
    <aside className="flex h-auto max-h-[45vh] w-full shrink-0 flex-col gap-3 overflow-hidden border-t border-border bg-background p-4 lg:fixed lg:inset-y-0 lg:right-0 lg:z-30 lg:h-screen lg:max-h-none lg:w-[calc(var(--spacing)*100)] lg:border-l lg:border-t-0">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold leading-tight">{t.courseChatTitle}</p>
            <p className="text-xs text-muted-foreground">{t.courseChatDescription}</p>
          </div>
          {onRefreshCourse && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2"
              onClick={onRefreshCourse}
              disabled={refreshDisabled || materialsLoading}
              aria-label={t.courseChatRefresh}
            >
              <RefreshCw className={cn("h-4 w-4", materialsLoading && "animate-spin")} />
            </Button>
          )}
        </div>
        {extractedLabel && (
          <p className="text-[11px] text-muted-foreground">{extractedLabel}</p>
        )}
        {focusedStudentName && (
          <p className="text-xs text-muted-foreground">
            {t.courseChatFocusedStudent(focusedStudentName)}
          </p>
        )}
        {focusedAssignmentTitle && (
          <p className="text-xs text-muted-foreground">
            {t.courseChatFocusedAssignment(focusedAssignmentTitle)}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
        {!snapshot ? (
          <p className="text-center text-sm text-muted-foreground">{t.courseChatSelectCourse}</p>
        ) : materialsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.courseChatLoadingData}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{t.courseChatEmpty}</p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              language={language}
              isStreaming={message.id === streamingId && isLoading}
              loadingLabel={t.courseChatThinking}
            />
          ))
        )}
        <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ChatComposer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        placeholder={t.courseChatPlaceholder}
        isLoading={isLoading}
        sendLabel={t.courseChatSend}
        sendingLabel={t.courseChatSending}
        disabled={!snapshot || materialsLoading}
      />
    </aside>
  );
}
