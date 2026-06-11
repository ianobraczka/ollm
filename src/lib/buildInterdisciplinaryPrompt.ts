import type { ChatMessage } from "@/types/chat";
import type { InterdisciplinaryOutputType } from "@/types/curriculum";

const OUTPUT_TYPE_LABELS: Record<InterdisciplinaryOutputType, string> = {
  "lesson-plan": "Lesson Plan",
  "interdisciplinary-project": "Interdisciplinary Project",
  "learning-sequence": "Learning Sequence",
};

const SYSTEM_PROMPT = `You are an interdisciplinary curriculum planner for teachers at Colégio Horizonte, a Brazilian private school.

CRITICAL RULES:
1. Use ONLY the curriculum content provided below. Do not invent topics, units, BNCC skills, learning objectives, keywords, or project ideas.
2. The PRIMARY SUBJECT must remain the anchor of every plan. Connected subjects support and extend the primary subject — never replace it.
3. When multiple connected subjects are provided and no secondary subject was chosen by the teacher, analyze all connected subjects and select the STRONGEST interdisciplinary connection based on overlapping topics, keywords, learning objectives, project opportunities, and BNCC skills in the provided text.
4. When a secondary subject was chosen, build the plan using connections ONLY between the primary subject and that secondary subject.
5. If no strong connection exists in the provided curriculum, state that clearly and propose the best weaker but still plausible connection using only available content.
6. Cite specific items from the curriculum (topics, objectives, keywords, BNCC codes, project opportunities) when explaining your choices.

Style:
- Be practical and classroom-ready.
- Use clear markdown headings and structured bullets.
- Prefer concise, actionable language.`;

export function buildInterdisciplinaryPrompt(args: {
  curriculumContext: string;
  grade: number;
  periodLabel: string;
  primaryLabel: string;
  connectedLabels: string[];
  mode: "single-secondary" | "auto-discover";
  outputType: InterdisciplinaryOutputType;
  teacherGoal?: string;
  documentContext?: string;
}): string {
  const outputTitle = OUTPUT_TYPE_LABELS[args.outputType];
  const connectionInstruction =
    args.mode === "auto-discover"
      ? "The teacher did not specify a secondary subject. Review all CONNECTED SUBJECT sections, identify the strongest interdisciplinary link to the PRIMARY SUBJECT, and use only that connection for the plan."
      : `The teacher selected a secondary subject. Use only the connection between the PRIMARY SUBJECT and: ${args.connectedLabels.join(", ")}.`;

  const teacherGoalBlock = args.teacherGoal?.trim()
    ? `\nTeacher goal (incorporate if compatible with the curriculum):\n${args.teacherGoal.trim()}\n`
    : "";

  const documentBlock = args.documentContext?.trim()
    ? [
        "",
        "Additional reference documents (supplement curriculum when relevant):",
        "--------------------------------------------------------------",
        args.documentContext.trim(),
      ].join("\n")
    : "";

  return [
    SYSTEM_PROMPT,
    "",
    "Planning request:",
    "-----------------",
    `Grade: ${args.grade}`,
    `Period: ${args.periodLabel}`,
    `Primary subject (anchor): ${args.primaryLabel}`,
    `Connected subjects in context: ${args.connectedLabels.join(", ") || "none"}`,
    `Output type: ${outputTitle}`,
    connectionInstruction,
    teacherGoalBlock,
    documentBlock,
    "Provided curriculum (sole source of truth):",
    "------------------------------------------",
    args.curriculumContext,
    "",
    "Your response MUST include these sections using these exact markdown headings:",
    "",
    "## Primary Subject Content Used",
    "(List the specific topics, learning objectives, keywords, project opportunities, and BNCC skills from the PRIMARY SUBJECT curriculum that you are using.)",
    "",
    "## Connected Subject Content Used",
    "(List the specific content from the connected subject(s) you are using. Name which subject each item comes from.)",
    "",
    "## Interdisciplinary Rationale",
    "(Explain why these subjects connect for this period. Cite overlapping keywords, BNCC skills, topics, or project opportunities from the provided text. If the connection is weak, say so explicitly.)",
    "",
    `## ${outputTitle}`,
    `(Deliver the main ${outputTitle.toLowerCase()}, structured and classroom-ready. The primary subject must drive the structure.)`,
    "",
    "## Assessment Suggestions",
    "(Ground suggestions in the assessment ideas from the provided curriculum where available, adapted for interdisciplinary work.)",
    "",
    "## BNCC Skills Used",
    "(List BNCC skill codes explicitly mentioned in the provided curriculum context. If none apply, state that clearly.)",
    "",
    "Assistant:",
  ].join("\n");
}

const FOLLOW_UP_SYSTEM_PROMPT = `You are continuing a conversation about an interdisciplinary plan for teachers at Colégio Horizonte.

Use the curriculum content below as the primary source of truth. You may also use the reference documents when they add relevant context.

Continue helping the teacher refine, adapt, or extend the interdisciplinary plan based on the conversation. Stay practical and classroom-ready.`;

export function buildInterdisciplinaryFollowUpPrompt(args: {
  curriculumContext: string;
  documentContext: string;
  grade: number;
  periodLabel: string;
  primaryLabel: string;
  messages: ChatMessage[];
}): string {
  const conversation = args.messages
    .map((m) => `${m.role === "user" ? "Teacher" : "Assistant"}: ${m.content}`)
    .join("\n");

  const documentBlock = args.documentContext.trim()
    ? [
        "",
        "Reference documents:",
        "--------------------",
        args.documentContext.trim(),
      ].join("\n")
    : "";

  return [
    FOLLOW_UP_SYSTEM_PROMPT,
    "",
    `Planning context: Grade ${args.grade}, Period: ${args.periodLabel}, Primary subject: ${args.primaryLabel}`,
    "",
    "Curriculum (primary source):",
    "----------------------------",
    args.curriculumContext,
    documentBlock,
    "",
    "Conversation:",
    "------------",
    conversation,
    "",
    "Assistant:",
  ].join("\n");
}
