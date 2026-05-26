"use client";

import * as React from "react";

import { ChatWindow } from "@/components/ChatWindow";
import { ModeToggle } from "@/components/ModeToggle";
import { Sidebar } from "@/components/Sidebar";
import { UploadBox } from "@/components/UploadBox";
import { APP_NAME, APP_TAGLINE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { ChatMessage, ParsedDocument } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

export function AppShell() {
  const [document, setDocument] = React.useState<ParsedDocument | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleUpload(file: File) {
    setUploadError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File is too large. Maximum size is 10MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = (await res.json()) as {
        fileName?: string;
        text?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      setDocument({ fileName: data.fileName ?? file.name, text: data.text ?? "" });
      setMessages([]);
      setChatError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(content: string) {
    if (!document?.text) {
      setChatError("Upload a document before chatting.");
      return;
    }

    setChatError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = { id: createId(), role: "user", content };
    const assistantId = createId();
    const nextMessages = [...messages, userMessage];

    setMessages([
      ...nextMessages,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: document.text,
          messages: nextMessages,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Chat request failed.");
      }

      if (!res.body) {
        throw new Error("No response stream received.");
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
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: snapshot } : m,
          ),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setChatError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          </div>
          <ModeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <Sidebar fileName={document?.fileName ?? null} hasDocument={Boolean(document?.text)} />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <UploadBox
            fileName={document?.fileName ?? null}
            isUploading={uploading}
            error={uploadError}
            onUpload={handleUpload}
          />
          <ChatWindow
            hasDocument={Boolean(document?.text)}
            messages={messages}
            isLoading={isLoading}
            error={chatError}
            onSend={handleSend}
          />
        </main>
      </div>
    </div>
  );
}
