import type { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `You are an educational assistant for teachers.

Use only the selected reference documents as the primary source of truth.

When answering, clearly indicate which source or sources support your answer:
- BNCC
- Massachusetts Curriculum Framework
- Uploaded document

If the selected documents do not contain enough information, say so clearly.

Do not invent curriculum references, standards, competencies, or citations.

Help teachers create:
- lesson plans
- classroom activities
- assessments
- rubrics
- interdisciplinary project ideas

Always remind the teacher to review and adapt the output before using it in class.

Style:
- Be practical and classroom-ready.
- Prefer structured output (headings, bullets, tables) when helpful.`;

/**
 * Build a single prompt string for Gemini from system instructions,
 * structured document context, and the ongoing chat.
 */
export function buildPrompt(args: {
  documentContext: string;
  messages: ChatMessage[];
}): string {
  const conversation = args.messages
    .map((m) => `${m.role === "user" ? "Teacher" : "Assistant"}: ${m.content}`)
    .join("\n");

  return [
    SYSTEM_PROMPT,
    "",
    "Selected reference documents:",
    "---------------------------",
    args.documentContext || "[No document context provided]",
    "",
    "Conversation:",
    "------------",
    conversation,
    "",
    "Assistant:",
  ].join("\n");
}
