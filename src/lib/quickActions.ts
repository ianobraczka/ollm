import type { AppLanguage } from "@/lib/i18n";

const QUICK_ACTIONS = {
  en: [
    {
      id: "lesson-plan",
      label: "Generate Lesson Plan",
      prompt:
        "Create a detailed lesson plan based on the selected reference documents. Include objectives, materials, step-by-step activities, timing, assessment ideas, and pedagogical differentiation (scaffolds, extensions, varied entry points). Cite which source(s) support each section. If the documents lack details, say what is missing.",
    },
    {
      id: "activity",
      label: "Generate Classroom Activity",
      prompt:
        "Suggest an engaging classroom activity aligned with the selected reference documents. Include setup, instructions, pedagogical differentiation (scaffolds, extensions, varied ways to show learning), and expected outcomes. Cite your sources. If the documents lack details, say what is missing.",
    },
    {
      id: "rubric",
      label: "Generate Rubric",
      prompt:
        "Draft a clear assessment rubric aligned with the selected reference documents. Use a table with criteria and performance levels, and note how it supports differentiation or flexible demonstration of learning. Cite your sources. If the documents lack details, say what is missing.",
    },
  ],
  "pt-BR": [
    {
      id: "lesson-plan",
      label: "Gerar Plano de Aula",
      prompt:
        "Crie um plano de aula detalhado com base nos documentos de referência selecionados. Inclua objetivos, materiais, atividades passo a passo, tempo estimado, ideias de avaliação e diferenciação pedagógica (andaimes, extensões, diferentes pontos de entrada). Cite qual(is) fonte(s) sustentam cada seção. Se os documentos não trouxerem detalhes suficientes, diga o que está faltando.",
    },
    {
      id: "activity",
      label: "Gerar Atividade de Sala",
      prompt:
        "Sugira uma atividade de sala envolvente alinhada aos documentos de referência selecionados. Inclua preparação, instruções, diferenciação pedagógica (andaimes, extensões, diferentes formas de demonstrar a aprendizagem) e resultados esperados. Cite suas fontes. Se os documentos não trouxerem detalhes suficientes, diga o que está faltando.",
    },
    {
      id: "rubric",
      label: "Gerar Rubrica",
      prompt:
        "Elabore uma rubrica de avaliação clara alinhada aos documentos de referência selecionados. Use uma tabela com critérios e níveis de desempenho, e indique como ela apoia a diferenciação ou formas flexíveis de demonstrar a aprendizagem. Cite suas fontes. Se os documentos não trouxerem detalhes suficientes, diga o que está faltando.",
    },
  ],
} as const;

export function getQuickActions(language: AppLanguage) {
  return QUICK_ACTIONS[language];
}
