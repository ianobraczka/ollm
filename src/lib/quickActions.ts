export const QUICK_ACTIONS = [
  {
    id: "lesson-plan",
    label: "Generate Lesson Plan",
    prompt:
      "Create a detailed lesson plan based on the uploaded document. Include objectives, materials, step-by-step activities, timing, and assessment ideas. If the document lacks details, say what is missing.",
  },
  {
    id: "activity",
    label: "Generate Classroom Activity",
    prompt:
      "Suggest an engaging classroom activity aligned with the uploaded document. Include setup, instructions, differentiation, and expected outcomes. If the document lacks details, say what is missing.",
  },
  {
    id: "rubric",
    label: "Generate Rubric",
    prompt:
      "Draft a clear assessment rubric aligned with the uploaded document. Use a table with criteria and performance levels. If the document lacks details, say what is missing.",
  },
  {
    id: "summary",
    label: "Summarize Document",
    prompt:
      "Summarize the uploaded document for a teacher. Highlight key competencies, themes, and anything useful for planning. If the document lacks details, say what is missing.",
  },
] as const;
