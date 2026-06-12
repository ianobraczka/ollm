import { NextResponse } from "next/server";

import { isValidLessonPlanGrade } from "@/lib/lessonPlans.shared";
import { getLessonPlansForGrade } from "@/lib/lessonPlans.server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = Number(searchParams.get("grade") ?? "5");

    if (!isValidLessonPlanGrade(grade)) {
      return NextResponse.json(
        { error: "Invalid grade. Choose 5, 6, 7, or 8." },
        { status: 400 },
      );
    }

    const data = await getLessonPlansForGrade(grade);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/lesson-plans]", error);
    const message =
      error instanceof Error ? error.message : "Failed to load lesson plans.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
