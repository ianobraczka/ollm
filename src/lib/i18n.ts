export type AppLanguage = "en" | "pt-BR";

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
  },
} as const;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "pt-BR" ? "pt-BR" : "en";
}
