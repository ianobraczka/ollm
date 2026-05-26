import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type SupportedUploadMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

export function getSupportedMime(file: File): SupportedUploadMime | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (file.type === "text/plain" || name.endsWith(".txt")) {
    return "text/plain";
  }
  return null;
}

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text?.trim() ?? "";
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

export async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8").trim();
}

export async function parseUpload(file: File): Promise<string> {
  const mime = getSupportedMime(file);
  if (!mime) {
    throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  switch (mime) {
    case "application/pdf":
      return parsePdf(buffer);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);
    case "text/plain":
      return parseTxt(buffer);
    default:
      return "";
  }
}
