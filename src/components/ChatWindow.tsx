"use client";

import { Download, Send, X } from "lucide-react";
import * as React from "react";

import { MessageBubble } from "@/components/MessageBubble";
import { ModeToggle } from "@/components/ModeToggle";
import { QuickActions } from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

type ChatWindowProps = {
  language: AppLanguage;
  canChat: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  uploadError: string | null;
  onSend: (content: string) => Promise<void>;
};

export function ChatWindow({
  language,
  canChat,
  messages,
  isLoading,
  error,
  uploadError,
  onSend,
}: ChatWindowProps) {
  const t = UI_TEXT[language];
  const [input, setInput] = React.useState("");
  const [visibleError, setVisibleError] = React.useState<string | null>(null);
  const [visibleUploadError, setVisibleUploadError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const streamingId = isLoading
    ? messages.filter((m) => m.role === "assistant").at(-1)?.id
    : undefined;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  React.useEffect(() => {
    if (!error) return;
    setVisibleError(error);
    const t = window.setTimeout(() => setVisibleError(null), 5000);
    return () => window.clearTimeout(t);
  }, [error]);

  React.useEffect(() => {
    if (!uploadError) return;
    setVisibleUploadError(uploadError);
    const t = window.setTimeout(() => setVisibleUploadError(null), 5000);
    return () => window.clearTimeout(t);
  }, [uploadError]);

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !canChat) return;
    setInput("");
    await onSend(trimmed);
    textareaRef.current?.focus();
  }

  function exportLastAssistant() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content) return;

    const blob = new Blob([lastAssistant.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lesson-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-2 py-6 pb-56 lg:px-3">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {canChat
                ? t.chatEmptyWithSources
                : t.chatEmptyNoSources}
            </p>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                language={language}
                isStreaming={message.id === streamingId && isLoading}
                loadingLabel={t.chatThinking}
              />
            ))
          )}
          <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:left-[calc(var(--spacing)*100)]">
        <div className="pointer-events-auto bg-gradient-to-t from-background from-40% via-background/95 to-transparent px-2 pb-4 pt-10 lg:px-3">
          <div className="mx-auto w-full max-w-6xl space-y-3">
            {visibleUploadError && (
              <div className="relative rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded p-1 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t.dismiss}
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
                  aria-label={t.dismiss}
                  onClick={() => setVisibleError(null)}
                >
                  <X className="h-4 w-4" />
                </button>
                {visibleError}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <QuickActions
                language={language}
                disabled={!canChat || isLoading}
                onSelect={(prompt) => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
              />
              {lastAssistant?.content && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={exportLastAssistant}
                >
                  <Download className="h-4 w-4" />
                  {t.export}
                </Button>
              )}
            </div>

            <form
              className="rounded-2xl border border-border/60 bg-background/90 p-3 shadow-lg backdrop-blur-md"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  canChat
                    ? t.chatPlaceholderWithSources
                    : t.chatPlaceholderNoSources
                }
                disabled={!canChat || isLoading}
                rows={3}
                className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2 pt-2">
                <ModeToggle language={language} />
                <Button type="submit" disabled={!canChat || isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                  {isLoading ? t.sending : t.send}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
