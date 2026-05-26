import { ensurePdfJsGlobals } from "@/lib/pdfPolyfills";

/** PDF parsing isolated so TXT/DOCX routes never load pdfjs at import time. */
export async function parsePdf(buffer: Buffer): Promise<string> {
  await ensurePdfJsGlobals();
  const { pdf } = await import("pdf-parse");
  const result = await pdf(buffer);
  return result.text?.trim() ?? "";
}
