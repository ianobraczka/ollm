import { NextResponse } from "next/server";

import { buildAssessmentContextText } from "@/lib/assessmentContext";
import { buildCourseChatPrompt } from "@/lib/buildCoursePrompt";
import {
  classifyCourseQuestion,
  needsAssignmentDeepContext,
} from "@/lib/classifyCourseQuestion";
import { buildCourseAnalytics, serializeCourseAnalytics } from "@/lib/courseAnalytics";
import { buildDocumentContext } from "@/lib/documentContext";
import { generateContentStreamWithFallback } from "@/lib/gemini";
import {
  loadCourseAssignmentMetadata,
  selectAssignmentIdsForMetadata,
  shouldLoadAssignmentMetadata,
} from "@/lib/loadCourseAssignmentMetadata";
import { fetchAssessmentData } from "@/lib/schoology/assessmentService";
import { normalizeLanguage } from "@/lib/i18n";
import type { CourseSnapshot } from "@/types/schoology";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const CURRICULUM_DOC_IDS = ["bncc", "massachusetts-framework"] as const;

export type CourseChatRequestBody = {
  messages: ChatMessage[];
  snapshot: CourseSnapshot;
  courseName?: string;
  focusedAssignmentId?: string;
  focusedStudentUid?: string;
  responseLanguage?: string;
};

function getLatestUserMessage(messages: ChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return messages[index]?.content?.trim() ?? "";
    }
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CourseChatRequestBody>;

    if (!body.snapshot || typeof body.snapshot !== "object") {
      return NextResponse.json({ error: "Course snapshot is required." }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const snapshot = body.snapshot;
    const courseName =
      typeof body.courseName === "string" ? body.courseName.trim() : snapshot.courseName;
    const focusedAssignmentId =
      typeof body.focusedAssignmentId === "string"
        ? body.focusedAssignmentId.trim()
        : undefined;
    const focusedStudentUid =
      typeof body.focusedStudentUid === "string" ? body.focusedStudentUid.trim() : undefined;
    const responseLanguage = normalizeLanguage(body.responseLanguage);
    const latestQuestion = getLatestUserMessage(body.messages);

    const classification = classifyCourseQuestion(
      latestQuestion,
      snapshot,
      focusedAssignmentId,
      focusedStudentUid,
    );
    const analytics = buildCourseAnalytics(snapshot, classification);

    let focusedAssignmentContext: string | undefined;
    let assignmentMetadataContext: string | undefined;

    if (needsAssignmentDeepContext(classification) && focusedAssignmentId) {
      try {
        const assessment = await fetchAssessmentData(
          snapshot.sectionId,
          focusedAssignmentId,
          "assignment",
        );
        focusedAssignmentContext = buildAssessmentContextText(assessment, courseName);
      } catch (error) {
        console.warn("[api/assessment-assistant/chat] focused assignment load failed", error);
        focusedAssignmentContext =
          "[Focused assignment details could not be loaded. Answer using course analytics only.]";
      }
    } else if (focusedAssignmentId) {
      const focused = snapshot.assignments.find(
        (assignment) => assignment.id === focusedAssignmentId,
      );
      if (focused) {
        focusedAssignmentContext = `Assignment: ${focused.title} (ID ${focused.id}, category: ${focused.categoryName}).`;
      }
    }

    if (shouldLoadAssignmentMetadata(classification)) {
      const assignmentIds = selectAssignmentIdsForMetadata(snapshot, classification, {
        focusedStudentUid,
        focusedAssignmentId,
      });

      if (assignmentIds.length > 0) {
        try {
          assignmentMetadataContext = await loadCourseAssignmentMetadata(
            snapshot.sectionId,
            snapshot,
            assignmentIds,
          );
        } catch (error) {
          console.warn("[api/assessment-assistant/chat] assignment metadata load failed", error);
          assignmentMetadataContext =
            "[Assignment descriptions and rubrics could not be loaded. Use titles and analytics only.]";
        }
      }
    }

    const [documentContext] = await Promise.all([
      buildDocumentContext({
        selectedBuiltInDocs: [...CURRICULUM_DOC_IDS],
        useUploadedDocument: false,
      }),
    ]);

    if (!documentContext.trim()) {
      return NextResponse.json(
        { error: "Curriculum documents could not be loaded." },
        { status: 500 },
      );
    }

    const basePrompt = buildCourseChatPrompt({
      courseName,
      analyticsContext: serializeCourseAnalytics(analytics),
      assignmentMetadataContext,
      focusedAssignmentContext,
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
