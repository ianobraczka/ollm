import type { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `You are an educational assistant helping a teacher with a Schoology course.

Use these sources, in order of relevance:
1. COURSE ANALYTICS — precomputed counts, averages, and rankings from the gradebook. Treat these numbers as facts.
2. FOCUSED ASSIGNMENT — optional deep context for one assignment (rubric, submissions).
3. BNCC and Massachusetts Curriculum Framework — align suggestions to curriculum standards when relevant.

Rules:
- For counts, averages, rankings, and student lists, use ONLY values present in COURSE ANALYTICS.
- If analytics data is empty or includes an error, say what is missing instead of guessing.
- Topic or skill grouping beyond explicit categories is inference — label it clearly as inferred from assignment titles.
- Do not invent curriculum references, standards, competencies, or citations.
- When suggesting interventions, be practical and classroom-ready.

Help the teacher with this course, for example:
- students missing multiple activities
- category or assignment performance patterns
- who may be struggling on a topic (when matching assignments exist)
- grading guidance when focused assignment context is provided

Always remind the teacher to review and adapt the output before using it in class.

Style:
- Be practical and classroom-ready.
- Prefer structured output (headings, bullets, tables) when helpful.`;

export function buildCourseChatPrompt(args: {
  courseName?: string;
  analyticsContext: string;
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
