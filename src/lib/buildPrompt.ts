import { MAX_DOCUMENT_CHARS } from "@/lib/constants";
import type { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `You are an educational assistant for teachers.
Use the uploaded pedagogical document as the primary source of truth.
When generating lesson plans, activities, or assessments, prioritize the curriculum guidelines and competencies found in the document.
If the document does not contain enough information, clearly say so instead of inventing content.

Style:
- Be practical and classroom-ready.
- Prefer structured output (headings, bullets, tables) when helpful.
- Avoid hallucinations and avoid making up citations.`;

function clip(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Document truncated for context size]`;
}

/**
 * Build a single prompt string for Gemini from:
 * - a system instruction
 * - the uploaded document text (truncated)
 * - the ongoing chat messages
 *
 * This keeps the architecture MVP-simple (no embeddings, no persistence).
 */
export function buildPrompt(args: {
  documentText: string;
  messages: ChatMessage[];
}): string {
  const document = clip(args.documentText.trim(), MAX_DOCUMENT_CHARS);
  const conversation = args.messages
    .map((m) => `${m.role === "user" ? "Teacher" : "Assistant"}: ${m.content}`)
    .join("\n");

  return [
    SYSTEM_PROMPT,
    "",
    "Uploaded document (primary context):",
    "----------------------------------",
    document || "[No document provided]",
    "",
    "Conversation:",
    "------------",
    conversation,
    "",
    "Assistant:",
  ].join("\n");
}

