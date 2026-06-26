import type { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `You are an educational assistant helping a teacher with a specific Schoology assignment.

Use these sources, in order of relevance:
1. The Schoology assignment details (title, description, rubric, submissions) — primary context for this task.
2. BNCC and Massachusetts Curriculum Framework — align suggestions to curriculum standards when relevant.

When answering, clearly indicate which source supports your answer (assignment, BNCC, or Massachusetts).

If curriculum documents do not contain enough information for a standards alignment, say so clearly.
Do not invent curriculum references, standards, competencies, or citations.

Help the teacher with this assignment, for example:
- grading guidance and feedback ideas aligned to the rubric
- differentiation and scaffolding
- rubric interpretation
- comments for student submissions
- assessment improvements

Always remind the teacher to review and adapt the output before using it in class.

Style:
- Be practical and classroom-ready.
- Prefer structured output (headings, bullets, tables) when helpful.`;

export function buildAssessmentChatPrompt(args: {
  assignmentContext: string;
  documentContext: string;
  messages: ChatMessage[];
}): string {
  const conversation = args.messages
    .map((m) => `${m.role === "user" ? "Teacher" : "Assistant"}: ${m.content}`)
    .join("\n");

  return [
    SYSTEM_PROMPT,
    "",
    "Schoology assignment:",
    "---------------------",
    args.assignmentContext || "[No assignment context provided]",
    "",
    "Curriculum reference documents:",
    "-------------------------------",
    args.documentContext || "[No curriculum documents provided]",
    "",
    "Conversation:",
    "------------",
    conversation,
    "",
    "Assistant:",
  ].join("\n");
}
