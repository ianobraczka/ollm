import { File } from "node:buffer";

import { NextResponse } from "next/server";

import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { parseUpload } from "@/lib/parsers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const text = await parseUpload(file);
    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this file." },
        { status: 400 },
      );
    }

    return NextResponse.json({ fileName: file.name, text });
  } catch (error) {
    console.error("[api/parse]", error);
    const message = error instanceof Error ? error.message : "Failed to parse file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
