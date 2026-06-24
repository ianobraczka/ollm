import { NextResponse } from "next/server";

import { fetchTeacherCourses } from "@/lib/schoology/courseService";
import { SchoologyConfigError, SchoologySessionExpiredError } from "@/lib/schoology/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await fetchTeacherCourses();
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SchoologySessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof SchoologyConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to load Schoology courses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
