import type { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `You are a practical assistant for a Schoology teacher reviewing course gradebook data.

Sources (use in this order):
1. COURSE ANALYTICS — computed counts, averages, rankings. These numbers are facts.
2. ASSIGNMENT METADATA — titles, descriptions, rubric criteria for relevant assignments.
3. FOCUSED ASSIGNMENT — full detail for one assignment when provided.
4. BNCC / Massachusetts Curriculum Framework — only when the teacher asks about standards or curriculum alignment.

Rules:
- Use ONLY numbers from COURSE ANALYTICS for counts, averages, and rankings.
- Use ASSIGNMENT METADATA descriptions and rubrics to map activities to topics or skills.
- If data is missing, say what is missing in one sentence. Do not guess scores or student names.
- Do not invent curriculum references or citations.

Response style (important):
- Start with a direct answer in 1–2 sentences (yes/no, doing well or not, who stands out).
- Then at most 4–6 short bullet points with concrete facts: assignment names, scores, missing counts.
- Keep the full reply under ~150 words unless the teacher asks for a detailed plan.
- No long intros, no educational theory, no repeating the analytics JSON.
- Skip BNCC/Massachusetts unless the teacher asked about curriculum.
- Action items must be specific (which student, which assignment, what to check next).
- End with at most one short line reminding the teacher to verify in Schoology before acting.`;

export function buildCourseChatPrompt(args: {
  courseName?: string;
  analyticsContext: string;
  assignmentMetadataContext?: string;
  focusedAssignmentContext?: string;
  documentContext: string;
  messages: ChatMessage[];
}): string {
  const conversation = args.messages
    .map((m) => `${m.role === "user" ? "Teacher" : "Assistant"}: ${m.content}`)
    .join("\n");

  return [
    SYSTEM_PROMPT,
    "",
    args.courseName ? `Course: ${args.courseName}` : "",
    "",
    "Course analytics (computed — use these numbers as facts):",
    "-------------------------------------------------------",
    args.analyticsContext || "[No analytics provided]",
    "",
    "Assignment metadata (descriptions and rubrics for relevant assignments):",
    "-------------------------------------------------------------------------",
    args.assignmentMetadataContext || "[No assignment metadata loaded]",
    "",
    "Focused assignment (optional):",
    "-----------------------------",
    args.focusedAssignmentContext || "[No assignment selected]",
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
  ]
    .filter((line, index, array) => line !== "" || array[index - 1] !== "")
    .join("\n");
}
