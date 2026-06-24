import { NextResponse } from "next/server";

import {
  fetchAssessmentData,
  SchoologyPageNotFoundError,
} from "@/lib/schoology/assessmentService";
import { SchoologyConfigError, SchoologySessionExpiredError } from "@/lib/schoology/errors";
import type { SchoologyMaterialType, SchoologyRetrieveRequest } from "@/types/schoology";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseMaterialType(value: unknown): SchoologyMaterialType {
  return value === "test" ? "test" : "assignment";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SchoologyRetrieveRequest>;

    const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : "";
    const assessmentId =
      typeof body.assessmentId === "string" ? body.assessmentId.trim() : "";
    const materialType = parseMaterialType(body.materialType);
    const urlOverride =
      typeof body.urlOverride === "string" ? body.urlOverride.trim() : undefined;

    if (!assessmentId) {
      return NextResponse.json({ error: "Assessment ID is required." }, { status: 400 });
    }

    if (materialType === "test" && !sectionId && !urlOverride) {
      return NextResponse.json(
        { error: "Section ID is required for test/quiz materials." },
        { status: 400 },
      );
    }

    const data = await fetchAssessmentData(
      sectionId,
      assessmentId,
      materialType,
      urlOverride,
    );

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof SchoologySessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof SchoologyPageNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    if (err instanceof SchoologyConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to retrieve assessment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
