import { NextResponse } from "next/server";

import { generateContentStreamWithFallback } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dev-only connectivity check for Gemini from the Next.js server process. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const { result, modelName } = await generateContentStreamWithFallback(
      "Reply with exactly: NEXT-OK",
    );
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.text();
    }
    return NextResponse.json({ ok: true, modelName, text: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error && error.cause
          ? String(error.cause)
          : undefined;
    console.error("[api/assessment-assistant/gemini-ping]", message, cause ?? "");
    return NextResponse.json({ ok: false, error: message, cause }, { status: 500 });
  }
}
