"use client";

import { Download, Send, X } from "lucide-react";
import * as React from "react";

import {
  InterdisciplinaryPlanningForm,
} from "@/components/InterdisciplinaryPlanningForm";
import { MessageBubble } from "@/components/MessageBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLANNING_TEXT, UI_TEXT, type AppLanguage } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";
import type { InterdisciplinaryFormValues } from "@/types/curriculum";

type PlanningChatWindowProps = {
  language: AppLanguage;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  uploadError: string | null;
  onInitialSubmit: (values: InterdisciplinaryFormValues) => Promise<void>;
  onFollowUpSend: (content: string) => Promise<void>;
};

export function PlanningChatWindow({
  language,
  messages,
  isLoading,
  error,
  uploadError,
  onInitialSubmit,
  onFollowUpSend,
}: PlanningChatWindowProps) {
  const t = PLANNING_TEXT[language];
  const ui = UI_TEXT[language];
  const [input, setInput] = React.useState("");
  const [visibleError, setVisibleError] = React.useState<string | null>(null);
  const [visibleUploadError, setVisibleUploadError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const hasStarted = messages.length > 0;

  const streamingId = isLoading
    ? messages.filter((m) => m.role === "assistant").at(-1)?.id
    : undefined;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  React.useEffect(() => {
    if (!error) return;
    setVisibleError(error);
    const timer = window.setTimeout(() => setVisibleError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  React.useEffect(() => {
    if (!uploadError) return;
    setVisibleUploadError(uploadError);
    const timer = window.setTimeout(() => setVisibleUploadError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [uploadError]);

  async function submitFollowUp() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !hasStarted) return;
    setInput("");
    await onFollowUpSend(trimmed);
    textareaRef.current?.focus();
  }

  function exportLastAssistant() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content) return;

    const blob = new Blob([lastAssistant.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interdisciplinary-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const errorAlerts = (
    <>
      {visibleUploadError && (
        <div className="relative rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            aria-label={ui.dismiss}
            onClick={() => setVisibleUploadError(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {visibleUploadError}
        </div>
      )}

      {visibleError && (
        <div className="relative rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            aria-label={ui.dismiss}
            onClick={() => setVisibleError(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {visibleError}
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {!hasStarted ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:px-3">
          <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
            <p className="text-center text-sm text-muted-foreground">{t.planningChatEmpty}</p>
            <div className="flex flex-1 items-center justify-center py-6">
              <div className="w-full space-y-4">
                {errorAlerts}
                <div className="rounded-2xl border border-border/60 bg-background/90 p-3 shadow-lg backdrop-blur-md">
                  <InterdisciplinaryPlanningForm
                    language={language}
                    isLoading={isLoading}
                    onSubmit={onInitialSubmit}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:px-3">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  language={language}
                  isStreaming={message.id === streamingId && isLoading}
                  loadingLabel={t.generating}
                />
              ))}
              <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:border-t-0 lg:px-3">
            <div className="mx-auto w-full max-w-6xl space-y-3">
              {errorAlerts}

              {lastAssistant?.content && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={exportLastAssistant}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.export}</span>
                  </Button>
                </div>
              )}

              <form
                className="rounded-2xl border border-border/60 bg-background/90 p-3 shadow-lg backdrop-blur-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitFollowUp();
                }}
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.chatPlaceholderFollowUp}
                  disabled={isLoading}
                  rows={3}
                  className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void submitFollowUp();
                    }
                  }}
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                    {isLoading ? ui.sending : ui.send}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
