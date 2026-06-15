export type AppLanguage = "en" | "pt-BR";

import type { Bimestre } from "@/types/lessonPlans";

export const LANGUAGE_STORAGE_KEY = "ollm-language";

export const LANGUAGE_OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

export const UI_TEXT = {
  "en": {
    sidebarUploadTitle: "Upload (optional)",
    sidebarUploadHelp: "Temporary PDF, DOCX, or TXT (session-only).",
    sidebarUploading: "Uploading…",
    sidebarChooseFiles: "Choose file(s)",
    sidebarActiveSources: "Active sources",
    sidebarSourcesSelected: "selected",
    sidebarUploads: "Uploads",
    sidebarUploadedDocument: "Uploaded document",
    sidebarSelectDocumentHint: "Select at least one reference document to enable chat.",
    docSelectorTitle: "Reference documents",
    docSelectorDescription:
      "Choose which sources Gemini may use. Only selected documents are sent to the model.",
    docSelectorBuiltInLegend: "Built-in reference documents",
    docSelectorUploadSession: "Uploaded document · Session-only",
    docSelectorUploadHint:
      "Upload a PDF, DOCX, or TXT below to include your own document as an optional source.",
    chatEmptyWithSources: "Use a quick action below or type a question to get started.",
    chatEmptyNoSources: "Select at least one reference document to enable the chat.",
    chatThinking: "Thinking…",
    dismiss: "Dismiss",
    export: "Export",
    chatPlaceholderWithSources:
      "Ask about lesson plans, activities, or assessments… (Ctrl+Enter to send)",
    chatPlaceholderNoSources: "Select at least one reference document first…",
    sending: "Sending…",
    send: "Send",
    copyResponse: "Copy response",
    copied: "Copied",
    copy: "Copy",
    toggleTheme: "Toggle theme",
    language: "Language",
    navPage: "Page",
    navChat: "Teaching assistant",
    navPlanning: "Interdisciplinary planning",
  },
  "pt-BR": {
    sidebarUploadTitle: "Upload (opcional)",
    sidebarUploadHelp: "PDF, DOCX ou TXT temporário (somente na sessão).",
    sidebarUploading: "Enviando…",
    sidebarChooseFiles: "Escolher arquivo(s)",
    sidebarActiveSources: "Fontes ativas",
    sidebarSourcesSelected: "selecionadas",
    sidebarUploads: "Uploads",
    sidebarUploadedDocument: "Documento enviado",
    sidebarSelectDocumentHint: "Selecione ao menos um documento de referência para habilitar o chat.",
    docSelectorTitle: "Documentos de referência",
    docSelectorDescription:
      "Escolha quais fontes o Gemini pode usar. Somente os documentos selecionados são enviados ao modelo.",
    docSelectorBuiltInLegend: "Documentos de referência internos",
    docSelectorUploadSession: "Documento enviado · Somente na sessão",
    docSelectorUploadHint:
      "Envie um PDF, DOCX ou TXT abaixo para incluir seu próprio documento como fonte opcional.",
    chatEmptyWithSources: "Use uma ação rápida abaixo ou digite uma pergunta para começar.",
    chatEmptyNoSources: "Selecione ao menos um documento de referência para habilitar o chat.",
    chatThinking: "Pensando…",
    dismiss: "Fechar",
    export: "Exportar",
    chatPlaceholderWithSources:
      "Pergunte sobre planos de aula, atividades ou avaliações… (Ctrl+Enter para enviar)",
    chatPlaceholderNoSources: "Selecione ao menos um documento de referência primeiro…",
    sending: "Enviando…",
    send: "Enviar",
    copyResponse: "Copiar resposta",
    copied: "Copiado",
    copy: "Copiar",
    toggleTheme: "Alternar tema",
    language: "Idioma",
    navPage: "Página",
    navChat: "Assistente de ensino",
    navPlanning: "Planejamento interdisciplinar",
  },
} as const;

export const PLANNING_TEXT = {
  en: {
    pageTitle: "Interdisciplinary Lesson Planning",
    pageDescription:
      "Generate lesson plans, projects, or learning sequences grounded in Colégio Horizonte curriculum plans. The primary subject anchors every plan; connected subjects extend it.",
    backToChat: "Back to chat",
    formTitle: "Plan settings",
    formDescription:
      "Select grade, period, and subjects. Leave secondary subject empty to let the AI find the strongest connection.",
    grade: "Grade",
    gradeLabel: (g: number) => `${g}th grade`,
    period: "Period",
    primarySubject: "Primary subject",
    secondarySubject: "Secondary subject (optional)",
    secondarySubjectAuto: "Auto-detect strongest connection",
    outputType: "Output type",
    outputLessonPlan: "Lesson plan",
    outputInterdisciplinaryProject: "Interdisciplinary project",
    outputLearningSequence: "Learning sequence",
    teacherGoal: "Teacher goal",
    teacherGoalPlaceholder:
      "e.g. Focus on sustainability, include a group presentation, emphasize data collection…",
    generatePlan: "Generate plan",
    generating: "Generating…",
    planningChatEmpty:
      "Configure plan settings below and generate your first interdisciplinary plan.",
    chatPlaceholderFollowUp:
      "Ask follow-up questions or request changes… (Ctrl+Enter to send)",
    resultTitle: "Generated plan",
    resultEmpty: "Fill in the form and generate a plan to see results here.",
    modeAutoDiscover: "Mode: auto-detected strongest connection",
    modeSingleSecondary: "Mode: primary + selected secondary subject",
    requestFailed: "Failed to generate plan.",
    noStream: "No response stream received.",
    copy: "Copy",
    copied: "Copied",
    export: "Export",
    navPlanning: "Interdisciplinary planning",
  },
  "pt-BR": {
    pageTitle: "Planejamento interdisciplinar",
    pageDescription:
      "Gere planos de aula, projetos ou sequências de aprendizagem com base nos planos curriculares do Colégio Horizonte. A disciplina principal ancora cada plano; as conexões a estendem.",
    backToChat: "Voltar ao chat",
    formTitle: "Configurações do plano",
    formDescription:
      "Selecione série, período e disciplinas. Deixe a disciplina secundária vazia para a IA encontrar a conexão mais forte.",
    grade: "Série",
    gradeLabel: (g: number) => `${g}º ano`,
    period: "Período",
    primarySubject: "Disciplina principal",
    secondarySubject: "Disciplina secundária (opcional)",
    secondarySubjectAuto: "Detectar automaticamente a melhor conexão",
    outputType: "Tipo de saída",
    outputLessonPlan: "Plano de aula",
    outputInterdisciplinaryProject: "Projeto interdisciplinar",
    outputLearningSequence: "Sequência de aprendizagem",
    teacherGoal: "Objetivo do professor",
    teacherGoalPlaceholder:
      "ex.: Foco em sustentabilidade, incluir apresentação em grupo, enfatizar coleta de dados…",
    generatePlan: "Gerar plano",
    generating: "Gerando…",
    planningChatEmpty:
      "Configure as opções abaixo e gere seu plano interdisciplinar.",
    chatPlaceholderFollowUp:
      "Faça perguntas de acompanhamento ou peça alterações… (Ctrl+Enter para enviar)",
    resultTitle: "Plano gerado",
    resultEmpty: "Preencha o formulário e gere um plano para ver os resultados aqui.",
    modeAutoDiscover: "Modo: conexão mais forte detectada automaticamente",
    modeSingleSecondary: "Modo: disciplina principal + secundária selecionada",
    requestFailed: "Falha ao gerar o plano.",
    noStream: "Nenhum fluxo de resposta recebido.",
    copy: "Copiar",
    copied: "Copiado",
    export: "Exportar",
    navPlanning: "Planejamento interdisciplinar",
  },
} as const;

const BIMESTRE_ORDINAL_EN: Record<Bimestre, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

export const LESSON_MAP_TEXT = {
  en: {
    pageTitle: "Lesson Map",
    gradeLabel: (grade: number) => `${grade}th grade`,
    bimestreLabel: (n: Bimestre) => `${BIMESTRE_ORDINAL_EN[n]} Quarter`,
    bimestreBadge: (n: Bimestre) => BIMESTRE_ORDINAL_EN[n],
    detailClose: "Close",
    loading: "Loading lesson map…",
    loadError: "Failed to load lesson map.",
    subjectPortuguese: "Portuguese",
    subjectEnglish: "English",
    subjectMath: "Mathematics",
    subjectScience: "Science",
    subjectGeography: "Geography",
    subjectBrazilianSocialStudies: "Brazilian Social Studies",
    subjectWorldSocialStudies: "World Social Studies",
    subjectVisualArts: "Visual Arts",
    subjectPhysicalEducation: "Physical Education",
    subjectDigitalEducation: "Digital Education",
    sectionBigIdea: "Big Idea",
    sectionTopics: "Topics",
    sectionLearningObjectives: "Learning Objectives",
    sectionBnccSkills: "BNCC Skills",
    sectionKeywords: "Keywords",
    sectionProjectOpportunities: "Project Opportunities",
    sectionAssessment: "Assessment Suggestions",
  },
  "pt-BR": {
    pageTitle: "Mapa Curricular",
    gradeLabel: (grade: number) => `${grade}º Ano`,
    bimestreLabel: (n: Bimestre) => `${n}º Bimestre`,
    bimestreBadge: (n: Bimestre) => `${n}º`,
    detailClose: "Fechar",
    loading: "Carregando mapa curricular…",
    loadError: "Falha ao carregar o mapa curricular.",
    subjectPortuguese: "Língua Portuguesa",
    subjectEnglish: "Inglês",
    subjectMath: "Matemática",
    subjectScience: "Ciências",
    subjectGeography: "Geografia",
    subjectBrazilianSocialStudies: "Estudos Sociais Brasil",
    subjectWorldSocialStudies: "Estudos Sociais Mundo",
    subjectVisualArts: "Artes Visuais",
    subjectPhysicalEducation: "Educação Física",
    subjectDigitalEducation: "Educação Digital",
    sectionBigIdea: "Ideia Central",
    sectionTopics: "Tópicos",
    sectionLearningObjectives: "Objetivos de Aprendizagem",
    sectionBnccSkills: "Habilidades BNCC",
    sectionKeywords: "Palavras-chave",
    sectionProjectOpportunities: "Oportunidades de Projeto",
    sectionAssessment: "Sugestões de Avaliação",
  },
} as const;

/** @deprecated Use LESSON_MAP_TEXT */
export const LESSON_PLANS_TEXT = LESSON_MAP_TEXT;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "pt-BR" ? "pt-BR" : "en";
}
