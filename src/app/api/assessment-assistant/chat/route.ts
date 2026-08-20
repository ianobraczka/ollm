import { NextResponse } from "next/server";

import {
  anonymizeChatMessages,
  anonymizeStructuredData,
  buildStudentAliasMap,
  isStudentNameAnonymizationEnabled,
  redactRosterNamesInText,
  rematerializeStudentAliases,
} from "@/lib/anonymizeStudents";
import { buildAssessmentContextText } from "@/lib/assessmentContext";
import { buildCourseChatPrompt } from "@/lib/buildCoursePrompt";
import {
  classifyCourseQuestion,
  needsAssignmentDeepContext,
  needsSubmissionExtracts,
} from "@/lib/classifyCourseQuestion";
import { buildCourseAnalytics, serializeCourseAnalytics } from "@/lib/courseAnalytics";
import { buildDocumentContext } from "@/lib/documentContext";
import { generateContentStreamWithFallback } from "@/lib/gemini";
import {
  loadCourseAssignmentMetadata,
  selectAssignmentIdsForMetadata,
  shouldLoadAssignmentMetadata,
} from "@/lib/loadCourseAssignmentMetadata";
import {
  loadSubmissionExtracts,
  serializeSubmissionExtracts,
} from "@/lib/loadSubmissionExtracts";
import { resolveTopicAssignments } from "@/lib/resolveTopicAssignments";
import { fetchAssessmentData } from "@/lib/schoology/assessmentService";
import { normalizeLanguage } from "@/lib/i18n";
import type { CourseSnapshot } from "@/types/schoology";
import type { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 120;

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

    const anonymize = isStudentNameAnonymizationEnabled();
    const aliasMap = anonymize ? buildStudentAliasMap(snapshot.students) : null;

    // Classification uses the real roster/question text server-side only.
    const classification = classifyCourseQuestion(
      latestQuestion,
      snapshot,
      focusedAssignmentId,
      focusedStudentUid,
    );

    let topicAssignmentIds: string[] | undefined;
    let topicDescriptions: Map<string, string> | undefined;

    if (classification.topic) {
      const topicResolution = await resolveTopicAssignments(
        snapshot.sectionId,
        snapshot,
        classification.topic,
        classification.studentUid ?? focusedStudentUid,
      );
      topicAssignmentIds = topicResolution.assignmentIds;
      topicDescriptions = topicResolution.descriptions;
    }

    const analytics = buildCourseAnalytics(snapshot, classification, { topicAssignmentIds });
    const analyticsForPrompt = aliasMap
      ? anonymizeStructuredData(analytics, aliasMap)
      : analytics;

    let focusedAssignmentContext: string | undefined;
    let assignmentMetadataContext: string | undefined;
    let submissionExtractsContext: string | undefined;

    if (
      (needsAssignmentDeepContext(classification) || needsSubmissionExtracts(classification)) &&
      focusedAssignmentId
    ) {
      try {
        const assessment = await fetchAssessmentData(
          snapshot.sectionId,
          focusedAssignmentId,
          "assignment",
        );
        focusedAssignmentContext = buildAssessmentContextText(assessment, courseName);

        if (needsSubmissionExtracts(classification)) {
          const startedAt = Date.now();
          const loaded = await loadSubmissionExtracts(snapshot.sectionId, focusedAssignmentId, {
            submissions: assessment.submissions,
            assignmentTitle: assessment.title,
          });
          submissionExtractsContext = serializeSubmissionExtracts(
            loaded.extracts,
            loaded.assignmentTitle,
          );
          console.log(
            `[api/assessment-assistant/chat] submission extracts ` +
              `${loaded.fromCache ? "cache-hit" : "loaded"} ` +
              `students=${loaded.extracts.length} ms=${Date.now() - startedAt}`,
          );
        }
      } catch (error) {
        console.warn("[api/assessment-assistant/chat] focused assignment/extracts failed", error);
        focusedAssignmentContext =
          focusedAssignmentContext ??
          "[Focused assignment details could not be loaded. Answer using course analytics only.]";
        if (needsSubmissionExtracts(classification)) {
          submissionExtractsContext =
            "[Submission file extracts could not be loaded. Answer using grades/analytics only and say that submission text was unavailable.]";
        }
      }
    } else if (needsSubmissionExtracts(classification) && !focusedAssignmentId) {
      submissionExtractsContext =
        "[Submission extracts were requested, but no assignment is focused. Ask the teacher to open/select an assignment first, then retry comparative analysis.]";
    } else if (focusedAssignmentId) {
      const focused = snapshot.assignments.find(
        (assignment) => assignment.id === focusedAssignmentId,
      );
      if (focused) {
        focusedAssignmentContext = `Assignment: ${focused.title} (ID ${focused.id}, category: ${focused.categoryName}).`;
      }
    }

    if (focusedAssignmentContext && aliasMap) {
      focusedAssignmentContext = redactRosterNamesInText(focusedAssignmentContext, aliasMap);
    }

    if (submissionExtractsContext && aliasMap) {
      submissionExtractsContext = redactRosterNamesInText(submissionExtractsContext, aliasMap);
    }

    if (shouldLoadAssignmentMetadata(classification)) {
      const assignmentIds = selectAssignmentIdsForMetadata(snapshot, classification, {
        focusedStudentUid,
        focusedAssignmentId,
        topicAssignmentIds,
      });

      if (assignmentIds.length > 0) {
        try {
          assignmentMetadataContext = await loadCourseAssignmentMetadata(
            snapshot.sectionId,
            snapshot,
            assignmentIds,
            topicDescriptions,
          );
        } catch (error) {
          console.warn("[api/assessment-assistant/chat] assignment metadata load failed", error);
          assignmentMetadataContext =
            "[Assignment descriptions and rubrics could not be loaded. Use titles and analytics only.]";
        }
      }
    }

    if (assignmentMetadataContext && aliasMap) {
      assignmentMetadataContext = redactRosterNamesInText(assignmentMetadataContext, aliasMap);
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

    const messagesForPrompt = aliasMap
      ? anonymizeChatMessages(body.messages, aliasMap)
      : body.messages;

    const basePrompt = buildCourseChatPrompt({
      courseName,
      analyticsContext: serializeCourseAnalytics(analyticsForPrompt),
      assignmentMetadataContext,
      focusedAssignmentContext,
      submissionExtractsContext,
      documentContext,
      messages: messagesForPrompt,
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
          // Buffer the model output so we can restore real names before the teacher sees them.
          let accumulated = "";
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) accumulated += text;
          }

          const rematerialized = aliasMap
            ? rematerializeStudentAliases(accumulated, aliasMap)
            : accumulated;

          const chunkSize = 48;
          for (let i = 0; i < rematerialized.length; i += chunkSize) {
            controller.enqueue(encoder.encode(rematerialized.slice(i, i + chunkSize)));
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
        ...(anonymize ? { "X-Student-Names-Anonymized": "1" } : {}),
      },
    });
  } catch (error) {
    console.error("[api/assessment-assistant/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate a response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
