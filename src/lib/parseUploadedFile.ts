import { getErrorMessage, readJsonResponse } from "@/lib/apiClient";
import type { ParsedDocument } from "@/types/chat";

function createId() {
  return crypto.randomUUID();
}

export async function parseUploadedFile(file: File): Promise<ParsedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/parse", { method: "POST", body: formData });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, `Failed to parse ${file.name}.`));
  }

  const data = await readJsonResponse<{
    fileName?: string;
    text?: string;
    error?: string;
  }>(res);

  return {
    id: createId(),
    fileName: data.fileName ?? file.name,
    text: data.text ?? "",
  };
}
