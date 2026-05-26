import { loadBuiltInDocumentText } from "@/lib/loadBuiltInDocument";
import { truncateDocument } from "@/lib/truncateDocument";

export const UPLOADED_DOCUMENT_SOURCE_LABEL = "Uploaded document";

function formatSourceBlock(args: {
  sourceLabel: string;
  text: string;
  wasTruncated: boolean;
  originalLength: number;
  truncatedLength: number;
}): string {
  const header = `[SOURCE: ${args.sourceLabel}]`;
  const note = args.wasTruncated
    ? `[NOTE: This document was truncated for MVP performance. Original length: ${args.originalLength} characters. Included length: ${args.truncatedLength} characters.]`
    : "";

  return [header, note, args.text].filter(Boolean).join("\n");
}

export type BuildDocumentContextArgs = {
  selectedBuiltInDocs: string[];
  uploadedDocumentText?: string;
  useUploadedDocument?: boolean;
};

/**
 * Load selected built-in .txt files and combine with optional uploaded text.
 * Only includes sources the client explicitly selected.
 */
export async function buildDocumentContext(
  args: BuildDocumentContextArgs,
): Promise<string> {
  const blocks: string[] = [];

  for (const id of args.selectedBuiltInDocs) {
    const { title, text } = await loadBuiltInDocumentText(id);
    if (!text) continue;
    const t = truncateDocument(text);
    blocks.push(
      formatSourceBlock({
        sourceLabel: title,
        text: t.text,
        wasTruncated: t.wasTruncated,
        originalLength: t.originalLength,
        truncatedLength: t.truncatedLength,
      }),
    );
  }

  if (args.useUploadedDocument && args.uploadedDocumentText?.trim()) {
    const t = truncateDocument(args.uploadedDocumentText.trim());
    blocks.push(
      formatSourceBlock({
        sourceLabel: UPLOADED_DOCUMENT_SOURCE_LABEL,
        text: t.text,
        wasTruncated: t.wasTruncated,
        originalLength: t.originalLength,
        truncatedLength: t.truncatedLength,
      }),
    );
  }

  return blocks.join("\n\n");
}

export function hasDocumentContext(
  args: BuildDocumentContextArgs,
  context: string,
): boolean {
  const wantsUpload = Boolean(args.useUploadedDocument && args.uploadedDocumentText?.trim());
  const wantsBuiltIn = args.selectedBuiltInDocs.length > 0;
  return (wantsBuiltIn || wantsUpload) && context.trim().length > 0;
}
