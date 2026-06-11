"use client";

import * as React from "react";

import { ChatWindow } from "@/components/ChatWindow";
import { Sidebar } from "@/components/Sidebar";
import { getErrorMessage } from "@/lib/apiClient";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import {
  MAX_DOCUMENTS,
  MAX_UPLOAD_BYTES,
  NO_DOCUMENT_SELECTED_ERROR,
} from "@/lib/constants";
import { combineUploadedDocumentText } from "@/lib/documents";
import { parseUploadedFile } from "@/lib/parseUploadedFile";
import { useAppLanguage } from "@/lib/useAppLanguage";
import type { ChatMessage, ParsedDocument } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

export function AppShell() {
  const [language, setLanguage] = useAppLanguage();
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
          added.push(await parseUploadedFile(file));
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
          responseLanguage: language,
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
      <Sidebar
        language={language}
        onLanguageChange={setLanguage}
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

      <main className="min-h-screen min-w-0 lg:ml-[calc(var(--spacing)*100)]">
        <ChatWindow
          language={language}
          canChat={hasSelectedSources}
          messages={messages}
          isLoading={isLoading}
          error={chatError}
          uploadError={uploadError}
          onSend={handleSend}
        />
      </main>
    </div>
  );
}
