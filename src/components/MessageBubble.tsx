"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AssistantLoadingIndicator } from "@/components/AssistantLoadingIndicator";
import { Button } from "@/components/ui/button";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

type MessageBubbleProps = {
  language: AppLanguage;
  message: ChatMessage;
  isStreaming?: boolean;
  loadingLabel?: string;
};

export function MessageBubble({
  language,
  message,
  isStreaming,
  loadingLabel,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = React.useState(false);
  const t = UI_TEXT[language];
  const isWaitingForContent = Boolean(isStreaming && !message.content.trim());

  async function copyContent() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      data-role={message.role}
    >
      <div
        className={cn(
          "group relative rounded-2xl px-4 py-3 text-sm shadow-sm transition-[border-color,box-shadow] duration-300",
          isUser
            ? "max-w-[min(100%,42rem)] bg-primary text-primary-foreground"
            : "max-w-[min(100%,50.4rem)] border border-border bg-card text-card-foreground",
          isWaitingForContent && "assistant-streaming-shell",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : isWaitingForContent ? (
          <AssistantLoadingIndicator
            className="text-primary/70"
            label={loadingLabel ?? t.chatThinking}
          />
        ) : (
          <div className="prose prose-sm prose-sans dark:prose-invert max-w-none font-sans prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-headings:font-semibold prose-code:font-mono">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}

        {!isUser && message.content && !isStreaming && (
          <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={copyContent}
              aria-label={t.copyResponse}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t.copied}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t.copy}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
