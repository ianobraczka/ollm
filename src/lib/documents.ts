import type { ParsedDocument } from "@/types/chat";

/** Merge session uploads into one text block for the chat API. */
export function combineUploadedDocumentText(
  documents: Pick<ParsedDocument, "fileName" | "text">[],
): string {
  if (documents.length === 0) return "";
  if (documents.length === 1) return documents[0].text.trim();

  return documents
    .map(
      (doc, index) =>
        `### Upload ${index + 1}: ${doc.fileName}\n\n${doc.text.trim()}`,
    )
    .join("\n\n---\n\n");
}
