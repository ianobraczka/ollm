export const APP_NAME = "OLM Teaching Assistant";
export const APP_TAGLINE =
  "Chat with BNCC, Massachusetts frameworks, and your own curriculum documents.";

/** Per-source cap when sending full text to Gemini (not a RAG chunk limit). */
export const MAX_CHARS_PER_DOCUMENT = 100_000;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** Max files per session (combined text still capped by MAX_DOCUMENT_CHARS). */
export const MAX_DOCUMENTS = 5;

/** @deprecated Legacy client payload cap; server uses MAX_CHARS_PER_DOCUMENT per source. */
export const MAX_DOCUMENT_CHARS = 28_000;

export const NO_DOCUMENT_SELECTED_ERROR =
  "Please select at least one reference document before chatting.";

