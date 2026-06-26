import { NextResponse } from "next/server";

import { buildAssessmentContextText } from "@/lib/assessmentContext";
import { buildAssessmentChatPrompt } from "@/lib/buildAssessmentPrompt";
import { buildDocumentContext } from "@/lib/documentContext";
import { generateContentStreamWithFallback } from "@/lib/gemini";
import { normalizeLanguage } from "@/lib/i18n";
import type { SchoologyAssessmentData } from "@/types/schoology";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const CURRICULUM_DOC_IDS = ["bncc", "massachusetts-framework"] as const;

export type AssessmentChatRequestBody = {
  messages: ChatMessage[];
  assessment: SchoologyAssessmentData;
  courseName?: string;
  responseLanguage?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<AssessmentChatRequestBody>;

    if (!body.assessment || typeof body.assessment !== "object") {
      return NextResponse.json({ error: "Assignment data is required." }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const courseName =
      typeof body.courseName === "string" ? body.courseName.trim() : undefined;
    const responseLanguage = normalizeLanguage(body.responseLanguage);

    const [documentContext, assignmentContext] = await Promise.all([
      buildDocumentContext({
        selectedBuiltInDocs: [...CURRICULUM_DOC_IDS],
        useUploadedDocument: false,
      }),
      Promise.resolve(buildAssessmentContextText(body.assessment, courseName)),
    ]);

    if (!documentContext.trim()) {
      return NextResponse.json(
        { error: "Curriculum documents could not be loaded." },
        { status: 500 },
      );
    }

    const basePrompt = buildAssessmentChatPrompt({
      assignmentContext,
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
    console.error("[api/assessment-assistant/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate a response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
