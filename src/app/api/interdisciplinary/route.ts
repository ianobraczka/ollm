import { NextResponse } from "next/server";

import { isBuiltInDocumentId } from "@/lib/builtInDocuments";
import {
  buildInterdisciplinaryFollowUpPrompt,
  buildInterdisciplinaryPrompt,
} from "@/lib/buildInterdisciplinaryPrompt";
import {
  getPeriodDisplayLabel,
  isValidGrade,
  isValidPeriod,
  isValidSubject,
} from "@/lib/curriculumPlans.shared";
import { getCurriculumContextForInterdisciplinaryPlan } from "@/lib/curriculumPlans.server";
import { buildDocumentContext } from "@/lib/documentContext";
import { generateContentStreamWithFallback } from "@/lib/gemini";
import { normalizeLanguage } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";
import type {
  CurriculumPeriod,
  CurriculumSubject,
  InterdisciplinaryOutputType,
  InterdisciplinaryPlanRequest,
} from "@/types/curriculum";

export const runtime = "nodejs";
export const maxDuration = 60;

const OUTPUT_TYPES: InterdisciplinaryOutputType[] = [
  "lesson-plan",
  "interdisciplinary-project",
  "learning-sequence",
];

function isValidOutputType(value: string): value is InterdisciplinaryOutputType {
  return (OUTPUT_TYPES as readonly string[]).includes(value);
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (message): message is ChatMessage =>
      message &&
      typeof message === "object" &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      typeof message.id === "string",
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InterdisciplinaryPlanRequest;

    const grade = Number(body.grade);
    const period = body.period;
    const primarySubject = body.primarySubject;
    const secondarySubject =
      body.secondarySubject === "" ? undefined : body.secondarySubject ?? undefined;
    const outputType = body.outputType;
    const teacherGoal =
      typeof body.teacherGoal === "string" ? body.teacherGoal : undefined;
    const responseLanguage = normalizeLanguage(body.responseLanguage);
    const messages = normalizeMessages(body.messages);

    const selectedBuiltInDocs = Array.isArray(body.selectedBuiltInDocs)
      ? body.selectedBuiltInDocs.filter((id) => typeof id === "string" && isBuiltInDocumentId(id))
      : [];

    const useUploadedDocument = Boolean(body.useUploadedDocument);
    const uploadedDocumentText =
      typeof body.uploadedDocumentText === "string" ? body.uploadedDocumentText : undefined;

    if (!isValidGrade(grade)) {
      return NextResponse.json({ error: "Invalid grade. Choose 5, 6, 7, or 8." }, { status: 400 });
    }

    if (!isValidPeriod(period)) {
      return NextResponse.json({ error: "Invalid period." }, { status: 400 });
    }

    if (!isValidSubject(primarySubject)) {
      return NextResponse.json({ error: "Invalid primary subject." }, { status: 400 });
    }

    if (secondarySubject !== undefined && !isValidSubject(secondarySubject)) {
      return NextResponse.json({ error: "Invalid secondary subject." }, { status: 400 });
    }

    if (secondarySubject === primarySubject) {
      return NextResponse.json(
        { error: "Secondary subject must differ from the primary subject." },
        { status: 400 },
      );
    }

    const isFollowUp = messages.some((message) => message.role === "assistant");

    if (!isFollowUp && !isValidOutputType(outputType)) {
      return NextResponse.json({ error: "Invalid output type." }, { status: 400 });
    }

    const contextResult = await getCurriculumContextForInterdisciplinaryPlan({
      grade,
      period: period as CurriculumPeriod,
      primarySubject: primarySubject as CurriculumSubject,
      secondarySubject: secondarySubject as CurriculumSubject | undefined,
    });

    const documentContext = await buildDocumentContext({
      selectedBuiltInDocs,
      uploadedDocumentText,
      useUploadedDocument,
    });

    const periodLabel = getPeriodDisplayLabel(period as CurriculumPeriod);

    const basePrompt = isFollowUp
      ? buildInterdisciplinaryFollowUpPrompt({
          curriculumContext: contextResult.context,
          documentContext,
          grade,
          periodLabel,
          primaryLabel: contextResult.primaryLabel,
          messages,
        })
      : buildInterdisciplinaryPrompt({
          curriculumContext: contextResult.context,
          grade,
          periodLabel,
          primaryLabel: contextResult.primaryLabel,
          connectedLabels: contextResult.connectedLabels,
          mode: contextResult.mode,
          outputType: outputType as InterdisciplinaryOutputType,
          teacherGoal,
          documentContext,
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
        "X-Planning-Mode": contextResult.mode,
      },
    });
  } catch (error) {
    console.error("[api/interdisciplinary]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate interdisciplinary plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
