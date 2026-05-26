export const APP_NAME = "AI Teaching Assistant";
export const APP_TAGLINE =
  "Upload a curriculum document and generate lesson plans, activities, and teaching ideas.";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Keep context bounded. This is an MVP and we are not doing embeddings/RAG.
 * We include a truncated document excerpt as the primary source of truth.
 */
export const MAX_DOCUMENT_CHARS = 28_000;

