export const QUICK_ACTIONS = [
  {
    id: "lesson-plan",
    label: "Generate Lesson Plan",
    prompt:
      "Create a detailed lesson plan based on the selected reference documents. Include objectives, materials, step-by-step activities, timing, and assessment ideas. Cite which source(s) support each section. If the documents lack details, say what is missing.",
  },
  {
    id: "activity",
    label: "Generate Classroom Activity",
    prompt:
      "Suggest an engaging classroom activity aligned with the selected reference documents. Include setup, instructions, differentiation, and expected outcomes. Cite your sources. If the documents lack details, say what is missing.",
  },
  {
    id: "rubric",
    label: "Generate Rubric",
    prompt:
      "Draft a clear assessment rubric aligned with the selected reference documents. Use a table with criteria and performance levels. Cite your sources. If the documents lack details, say what is missing.",
  },
] as const;
