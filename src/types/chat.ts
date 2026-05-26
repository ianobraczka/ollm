export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type ParsedDocument = {
  fileName: string;
  /** Extracted plain text, held in memory only (client state). */
  text: string;
};

