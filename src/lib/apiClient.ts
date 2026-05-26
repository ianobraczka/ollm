type JsonErrorBody = { error?: string };

/**
 * Parse a fetch Response as JSON without throwing on HTML error pages
 * (common when /api/* hits the wrong dev server port or the route crashes).
 */
export async function readJsonResponse<T extends JsonErrorBody>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  const text = await res.text();
  const snippet = text.replace(/\s+/g, " ").slice(0, 120);

  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error(
      `Server returned an HTML page instead of JSON (HTTP ${res.status}). ` +
        `You may be on the wrong dev port — check the terminal for the URL ` +
        `(e.g. http://localhost:3030).`,
    );
  }

  throw new Error(
    snippet
      ? `Unexpected server response (HTTP ${res.status}): ${snippet}`
      : `Unexpected server response (HTTP ${res.status}).`,
  );
}

export async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await readJsonResponse<JsonErrorBody>(res);
    return data.error ?? fallback;
  } catch (err) {
    return err instanceof Error ? err.message : fallback;
  }
}
