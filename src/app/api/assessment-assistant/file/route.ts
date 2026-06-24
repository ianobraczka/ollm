import { NextResponse } from "next/server";

import { schoologyApiFetchAbsolute } from "@/lib/schoology/apiClient";
import { SchoologyConfigError, SchoologySessionExpiredError } from "@/lib/schoology/errors";
import { isAllowedSchoologyFileUrl } from "@/lib/schoology/schoologyFileUrls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[^\w.\-()+\s]/g, "_").trim();
  return cleaned || "download";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url")?.trim();
  const filename = sanitizeFilename(searchParams.get("filename")?.trim() || "download");

  if (!fileUrl || !isAllowedSchoologyFileUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid Schoology file URL." }, { status: 400 });
  }

  try {
    let response = await schoologyApiFetchAbsolute(fileUrl);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        response = await schoologyApiFetchAbsolute(new URL(location, fileUrl).toString());
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Schoology returned ${response.status} for this file.` },
        { status: response.status },
      );
    }

    const body = await response.arrayBuffer();
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(body, { status: 200, headers });
  } catch (err) {
    if (err instanceof SchoologySessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof SchoologyConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const message = err instanceof Error ? err.message : "Failed to download file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
