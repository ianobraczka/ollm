"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { ChatWindow } from "@/components/ChatWindow";
import { ModeToggle } from "@/components/ModeToggle";
import { Sidebar } from "@/components/Sidebar";
import { getErrorMessage, readJsonResponse } from "@/lib/apiClient";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import {
  APP_NAME,
  MAX_DOCUMENTS,
  MAX_UPLOAD_BYTES,
  NO_DOCUMENT_SELECTED_ERROR,
} from "@/lib/constants";
import { combineUploadedDocumentText } from "@/lib/documents";
import type { ChatMessage, ParsedDocument } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

async function parseFile(file: File): Promise<ParsedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse", { method: "POST", body: formData });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, `Failed to parse ${file.name}.`));
  }

  const data = await readJsonResponse<{
    fileName?: string;
    text?: string;
    error?: string;
  }>(res);

  return {
    id: createId(),
    fileName: data.fileName ?? file.name,
    text: data.text ?? "",
  };
}

export function AppShell() {
  const [documents, setDocuments] = React.useState<ParsedDocument[]>([]);
  const [selectedBuiltInIds, setSelectedBuiltInIds] = React.useState<string[]>(() =>
    BUILT_IN_DOCUMENTS.map((d) => d.id),
  );
  const [useUploadedDocument, setUseUploadedDocument] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const hasUploadedText = documents.some((doc) => doc.text.trim());
  const uploadedFileNames = documents.map((d) => d.fileName);

  const hasSelectedSources =
    selectedBuiltInIds.length > 0 || (useUploadedDocument && hasUploadedText);

  async function handleUpload(files: File[]) {
    setUploadError(null);

    const slotsLeft = MAX_DOCUMENTS - documents.length;
    if (slotsLeft <= 0) {
      setUploadError(`You can upload at most ${MAX_DOCUMENTS} documents per session.`);
      return;
    }

    if (files.length > slotsLeft) {
      setUploadError(
        `Only ${slotsLeft} more document${slotsLeft === 1 ? "" : "s"} allowed (max ${MAX_DOCUMENTS}).`,
      );
      return;
    }

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`"${file.name}" is too large. Maximum size is 10MB per file.`);
        return;
      }
    }

    setUploading(true);
    const added: ParsedDocument[] = [];
    const errors: string[] = [];

    try {
      for (const file of files) {
        try {
          added.push(await parseFile(file));
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `Failed to parse ${file.name}.`);
        }
      }

      if (added.length > 0) {
        setDocuments((prev) => [...prev, ...added]);
        setUseUploadedDocument(true);
        setChatError(null);
      }

      if (errors.length > 0) {
        setUploadError(errors.join(" "));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(content: string) {
    if (!hasSelectedSources) {
      setChatError(NO_DOCUMENT_SELECTED_ERROR);
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
      const uploadedDocumentText = hasUploadedText
        ? combineUploadedDocumentText(documents)
        : undefined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          selectedBuiltInDocs: selectedBuiltInIds,
          uploadedDocumentText,
          useUploadedDocument: useUploadedDocument && hasUploadedText,
        }),
      });

      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Chat request failed."));
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new Error(
          "Server returned HTML instead of a chat stream. Restart the dev server and use http://localhost:3030.",
        );
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
        <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-4 px-3 py-2 lg:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">{APP_NAME}</h1>
          </div>
          <ModeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[92rem] flex-col lg:flex-row">
        <Sidebar
          documents={documents}
          selectedBuiltInIds={selectedBuiltInIds}
          onBuiltInChange={setSelectedBuiltInIds}
          useUploadedDocument={useUploadedDocument}
          onUseUploadedChange={setUseUploadedDocument}
          hasUploadedDocument={hasUploadedText}
          uploadedFileNames={uploadedFileNames}
          isUploading={uploading}
          onUpload={handleUpload}
        />

        <main className="flex flex-1 flex-col gap-6 p-3 lg:p-4">
          <ChatWindow
            canChat={hasSelectedSources}
            messages={messages}
            isLoading={isLoading}
            error={chatError}
            uploadError={uploadError}
            isUploading={uploading}
            onUpload={handleUpload}
            onSend={handleSend}
          />
        </main>
      </div>
    </div>
  );
}
