import mammoth from "mammoth";

export type SupportedUploadMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

/** Minimal upload shape (browser File or Node buffer.File). */
export type ParsedUploadFile = {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function getSupportedMime(file: ParsedUploadFile): SupportedUploadMime | null {
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

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

export async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8").trim();
}

export async function parseUpload(file: ParsedUploadFile): Promise<string> {
  const mime = getSupportedMime(file);
  if (!mime) {
    throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  switch (mime) {
    case "application/pdf": {
      const { parsePdf } = await import("@/lib/parsePdf");
      return parsePdf(buffer);
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);
    case "text/plain":
      return parseTxt(buffer);
    default:
      return "";
  }
}
