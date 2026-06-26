import { truncateDocument } from "@/lib/truncateDocument";
import type { SchoologyAssessmentData } from "@/types/schoology";

const MAX_ASSESSMENT_CONTEXT_CHARS = 32_000;

function formatRubric(assessment: SchoologyAssessmentData): string | undefined {
  const rubric = assessment.rubric;
  if (!rubric) {
    return undefined;
  }

  const lines = [`Rubric: ${rubric.title}`];
  if (rubric.totalPoints) {
    lines.push(`Total points: ${rubric.totalPoints}`);
  }

  for (const criterion of rubric.criteria) {
    lines.push(`\n- ${criterion.title}`);
    if (criterion.description) {
      lines.push(`  Description: ${criterion.description}`);
    }
    if (criterion.maxPoints) {
      lines.push(`  Max points: ${criterion.maxPoints}`);
    }
    for (const rating of criterion.ratings) {
      const pts = rating.points != null ? `${rating.points} pts` : "";
      const desc = rating.description ?? "";
      lines.push(`  · ${[desc, pts].filter(Boolean).join(" — ")}`);
    }
  }

  return lines.join("\n");
}

function formatSubmissions(assessment: SchoologyAssessmentData): string | undefined {
  if (assessment.submissions.length === 0) {
    return undefined;
  }

  const lines = [`Student submissions (${assessment.submissions.length}):`];
  for (const sub of assessment.submissions) {
    const name = sub.studentName ?? sub.userId ?? "Unknown student";
    const grade = sub.gradeLetter ?? sub.score;
    const meta = [sub.status, sub.late ? "Late" : null, grade ? `Grade: ${grade}` : null]
      .filter(Boolean)
      .join(" · ");
    lines.push(`- ${name}${meta ? ` (${meta})` : ""}`);
    if (sub.body?.trim()) {
      const excerpt = sub.body.trim().slice(0, 500);
      lines.push(`  Text: ${excerpt}${sub.body.length > 500 ? "…" : ""}`);
    }
    if (sub.files.length > 0) {
      lines.push(`  Files: ${sub.files.map((f) => f.filename).join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Serialize assignment data for the assessment-assistant chat prompt. */
export function buildAssessmentContextText(
  assessment: SchoologyAssessmentData,
  courseName?: string,
): string {
  const blocks: string[] = ["[SOURCE: Schoology assignment]"];

  if (assessment.title) {
    blocks.push(`Title: ${assessment.title}`);
  }
  if (courseName) {
    blocks.push(`Course / section: ${courseName}`);
  }
  if (assessment.assessmentId) {
    blocks.push(`Assignment ID: ${assessment.assessmentId}`);
  }
  if (assessment.sectionId) {
    blocks.push(`Section ID: ${assessment.sectionId}`);
  }
  if (assessment.dueDate) {
    blocks.push(`Due: ${assessment.dueDate}`);
  }
  if (assessment.maxPoints) {
    blocks.push(`Max points: ${assessment.maxPoints}`);
  }
  if (assessment.description?.trim()) {
    blocks.push(`\nDescription:\n${assessment.description.trim()}`);
  }

  const rubric = formatRubric(assessment);
  if (rubric) {
    blocks.push(`\n${rubric}`);
  }

  const submissions = formatSubmissions(assessment);
  if (submissions) {
    blocks.push(`\n${submissions}`);
  }

  if (assessment.questions.length > 0) {
    blocks.push("\nQuestions / items:");
    for (const q of assessment.questions) {
      const parts = [
        q.title ?? `Item ${q.index}`,
        q.type,
        q.points ? `${q.points} pts` : null,
      ].filter(Boolean);
      blocks.push(`- ${parts.join(" · ")}`);
      if (q.text?.trim()) {
        blocks.push(`  ${q.text.trim().slice(0, 400)}`);
      }
    }
  }

  const raw = blocks.join("\n");
  const truncated = truncateDocument(raw, MAX_ASSESSMENT_CONTEXT_CHARS);
  if (truncated.wasTruncated) {
    return `${truncated.text}\n\n[NOTE: Assignment context was truncated for length.]`;
  }
  return truncated.text;
}
