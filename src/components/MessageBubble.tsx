"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = React.useState(false);

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
          "group relative max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (isStreaming ? "…" : "")}
            </ReactMarkdown>
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
              aria-label="Copy response"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
