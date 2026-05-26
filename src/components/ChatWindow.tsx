"use client";

import { Download, Loader2, Send } from "lucide-react";
import * as React from "react";

import { MessageBubble } from "@/components/MessageBubble";
import { QuickActions } from "@/components/QuickActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/types/chat";

type ChatWindowProps = {
  canChat: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSend: (content: string) => Promise<void>;
};

export function ChatWindow({
  canChat,
  messages,
  isLoading,
  error,
  onSend,
}: ChatWindowProps) {
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const streamingId = isLoading
    ? messages.filter((m) => m.role === "assistant").at(-1)?.id
    : undefined;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
    <Card className="flex min-h-[40rem] flex-1 flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Ask about lesson plans, activities, rubrics, and ideas grounded in your selected sources.
          </CardDescription>
        </div>
        {lastAssistant?.content && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={exportLastAssistant}
          >
            <Download className="h-4 w-4" />
            Export .txt
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <ScrollArea className="h-[min(50vh,28rem)] rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                {canChat
                  ? "Use a quick action below or type a question to get started."
                  : "Select at least one reference document to enable the chat."}
              </p>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={message.id === streamingId && isLoading}
                />
              ))
            )}
            {isLoading && messages.length > 0 && !streamingId && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <QuickActions
          disabled={!canChat || isLoading}
          onSelect={(prompt) => {
            setInput(prompt);
            textareaRef.current?.focus();
          }}
        />

        <form
          className="flex flex-col gap-2"
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
                ? "Ask about lesson plans, activities, or assessments… (Ctrl+Enter to send)"
                : "Select at least one reference document first…"
            }
            disabled={!canChat || isLoading}
            rows={3}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!canChat || isLoading || !input.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
