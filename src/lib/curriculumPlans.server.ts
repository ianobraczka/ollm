import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  getPeriodDisplayLabel,
  getPeriodLabel,
  getSubjectsByGrade,
  isValidGrade,
  SUBJECT_LABELS,
} from "@/lib/curriculumPlans.shared";
import type {
  CurriculumContextResult,
  CurriculumPeriod,
  CurriculumSubject,
} from "@/types/curriculum";

function planFilePath(grade: number, subject: CurriculumSubject): string {
  return `data/plans/${grade}th-grade-${subject}.txt`;
}

export async function getCurriculumPlan(
  grade: number,
  subject: CurriculumSubject,
): Promise<string> {
  if (!isValidGrade(grade)) {
    throw new Error(`Invalid grade: ${grade}`);
  }

  const filePath = planFilePath(grade, subject);
  const absolutePath = path.join(process.cwd(), filePath);

  try {
    const text = await readFile(absolutePath, "utf-8");
    return text.trim();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") {
      throw new Error(`Curriculum plan file is missing: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Keep the plan header and the unit matching the selected period.
 */
export function filterPlanByPeriod(fullText: string, periodLabel: string): string {
  const sections = fullText
    .split(/\n={50,}\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  const header = sections.find(
    (section) =>
      section.includes("Grade:") &&
      section.includes("Overview:") &&
      !/^Unit \d/m.test(section),
  );

  const unitSection = sections.find(
    (section) => /^Unit \d/m.test(section) && section.includes(`Period: ${periodLabel}`),
  );

  if (!header && !unitSection) return fullText;
  if (!unitSection) return header ?? fullText;

  const divider = "\n\n==================================================\n\n";
  return header ? `${header}${divider}${unitSection}` : unitSection;
}

function formatContextBlock(label: string, text: string): string {
  return [`[CURRICULUM: ${label}]`, text].join("\n");
}

export async function getCurriculumContextForInterdisciplinaryPlan(args: {
  grade: number;
  period: CurriculumPeriod;
  primarySubject: CurriculumSubject;
  secondarySubject?: CurriculumSubject;
}): Promise<CurriculumContextResult> {
  const { grade, period, primarySubject, secondarySubject } = args;
  const periodDataLabel = getPeriodLabel(period);
  const periodDisplayLabel = getPeriodDisplayLabel(period);

  const primaryFull = await getCurriculumPlan(grade, primarySubject);
  const primaryFiltered = filterPlanByPeriod(primaryFull, periodDataLabel);
  const primaryLabel = `${SUBJECT_LABELS[primarySubject]} (Grade ${grade}, ${periodDisplayLabel})`;

  let connectedSubjects: CurriculumSubject[];
  let mode: CurriculumContextResult["mode"];

  if (secondarySubject) {
    connectedSubjects = [secondarySubject];
    mode = "single-secondary";
  } else {
    connectedSubjects = getSubjectsByGrade(grade).filter((subject) => subject !== primarySubject);
    mode = "auto-discover";
  }

  const blocks = [formatContextBlock(`PRIMARY SUBJECT — ${primaryLabel}`, primaryFiltered)];
  const connectedLabels: string[] = [];

  for (const subject of connectedSubjects) {
    const full = await getCurriculumPlan(grade, subject);
    const filtered = filterPlanByPeriod(full, periodDataLabel);
    const label = `${SUBJECT_LABELS[subject]} (Grade ${grade}, ${periodDisplayLabel})`;
    connectedLabels.push(label);
    blocks.push(formatContextBlock(`CONNECTED SUBJECT — ${label}`, filtered));
  }

  return {
    context: blocks.join("\n\n"),
    primaryLabel,
    connectedLabels,
    mode,
  };
}
