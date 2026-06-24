import { NextResponse } from "next/server";

import { SchoologyConfigError, SchoologySessionExpiredError } from "@/lib/schoology/errors";
import { fetchCourseMaterials } from "@/lib/schoology/materialsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId")?.trim() ?? "";

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId query parameter is required." }, { status: 400 });
    }

    const data = await fetchCourseMaterials(sectionId);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SchoologySessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof SchoologyConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to load course materials.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
