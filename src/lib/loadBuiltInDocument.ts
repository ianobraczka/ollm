import { readFile } from "node:fs/promises";
import path from "node:path";

import { getBuiltInDocument, isBuiltInDocumentId } from "@/lib/builtInDocuments";

export async function loadBuiltInDocumentText(id: string): Promise<{
  id: string;
  title: string;
  text: string;
}> {
  if (!isBuiltInDocumentId(id)) {
    throw new Error(`Unknown built-in document id: ${id}`);
  }

  const meta = getBuiltInDocument(id)!;
  const absolutePath = path.join(process.cwd(), meta.filePath);

  let text: string;
  try {
    text = await readFile(absolutePath, "utf-8");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") {
      throw new Error(
        `Built-in document file is missing: ${meta.filePath}. ` +
          `Add the .txt file under /data/documents and register it in builtInDocuments.ts.`,
      );
    }
    throw error;
  }

  return { id, title: meta.title, text: text.trim() };
}
