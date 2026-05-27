import { NextResponse } from "next/server";

import { isBuiltInDocumentId } from "@/lib/builtInDocuments";
import { buildPrompt } from "@/lib/buildPrompt";
import { NO_DOCUMENT_SELECTED_ERROR } from "@/lib/constants";
import { buildDocumentContext, hasDocumentContext } from "@/lib/documentContext";
import { generateContentStreamWithFallback } from "@/lib/gemini";
import { normalizeLanguage } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ChatRequestBody = {
  messages: ChatMessage[];
  uploadedDocumentText?: string;
  selectedBuiltInDocs: string[];
  useUploadedDocument?: boolean;
  responseLanguage?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    const selectedBuiltInDocs = Array.isArray(body.selectedBuiltInDocs)
      ? body.selectedBuiltInDocs.filter((id) => typeof id === "string" && isBuiltInDocumentId(id))
      : [];

    const useUploadedDocument = Boolean(body.useUploadedDocument);
    const uploadedDocumentText =
      typeof body.uploadedDocumentText === "string" ? body.uploadedDocumentText : undefined;
    const responseLanguage = normalizeLanguage(body.responseLanguage);

    const hasSelection =
      selectedBuiltInDocs.length > 0 || (useUploadedDocument && uploadedDocumentText?.trim());

    if (!hasSelection) {
      return NextResponse.json({ error: NO_DOCUMENT_SELECTED_ERROR }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const documentContext = await buildDocumentContext({
      selectedBuiltInDocs,
      uploadedDocumentText,
      useUploadedDocument,
    });

    if (
      !hasDocumentContext(
        { selectedBuiltInDocs, uploadedDocumentText, useUploadedDocument },
        documentContext,
      )
    ) {
      return NextResponse.json({ error: NO_DOCUMENT_SELECTED_ERROR }, { status: 400 });
    }

    const basePrompt = buildPrompt({
      documentContext,
      messages: body.messages,
    });
    const prompt =
      responseLanguage === "pt-BR"
        ? `${basePrompt}\n\nLanguage instruction: Always respond in Brazilian Portuguese (pt-BR).\n`
        : `${basePrompt}\n\nLanguage instruction: Always respond in English.\n`;

    const { result, modelName } = await generateContentStreamWithFallback(prompt);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Gemini-Model": modelName,
      },
    });
  } catch (error) {
    console.error("[api/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate a response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
