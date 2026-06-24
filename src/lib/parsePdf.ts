import { ensurePdfJsGlobals } from "@/lib/pdfPolyfills";

/** PDF parsing isolated so TXT/DOCX routes never load pdfjs at import time. */
export async function parsePdf(buffer: Buffer): Promise<string> {
  await ensurePdfJsGlobals();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}
