"use client";

import * as React from "react";

import { ChatComposer } from "@/components/ChatComposer";
import { MessageBubble } from "@/components/MessageBubble";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/apiClient";
import { ASSESSMENT_TEXT, type AppLanguage } from "@/lib/i18n";
import type { SchoologyAssessmentData } from "@/types/schoology";
import type { ChatMessage } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

type AssignmentChatPanelProps = {
  language: AppLanguage;
  assessment: SchoologyAssessmentData;
  courseName: string;
};

export function AssignmentChatPanel({
  language,
  assessment,
  courseName,
}: AssignmentChatPanelProps) {
  const t = ASSESSMENT_TEXT[language];
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, [assessment.assessmentId]);

  const streamingId = isLoading
    ? messages.filter((m) => m.role === "assistant").at(-1)?.id
    : undefined;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function handleSend(content: string) {
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
          assessment,
          courseName,
          responseLanguage: language,
        }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, t.assignmentChatFailed));
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new Error(t.assignmentChatStreamError);
      }

      if (!res.body) {
        throw new Error(t.assignmentChatStreamError);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.assignmentChatFailed;
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await handleSend(trimmed);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.assignmentChatTitle}</CardTitle>
        <CardDescription>{t.assignmentChatDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t.assignmentChatEmpty}</p>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                language={language}
                isStreaming={message.id === streamingId && isLoading}
                loadingLabel={t.assignmentChatThinking}
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
          placeholder={t.assignmentChatPlaceholder}
          isLoading={isLoading}
          sendLabel={t.assignmentChatSend}
          sendingLabel={t.assignmentChatSending}
        />
      </CardContent>
    </Card>
  );
}
