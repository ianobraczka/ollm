import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  emptyBimestreSubjects,
  isValidLessonPlanGrade,
  LESSON_PLAN_SUBJECTS,
  PERIOD_LABEL_TO_BIMESTRE,
  SUBJECT_FILE_SLUG,
} from "@/lib/lessonPlans.shared";
import type {
  Bimestre,
  LessonPlanCard,
  LessonPlanSubject,
  LessonPlansBimestreData,
  LessonPlansGradeData,
} from "@/types/lessonPlans";

function planFilePath(grade: number, slug: string): string {
  return `data/plans/${grade}th-grade-${slug}.txt`;
}

function parseTopics(unitText: string): string[] {
  const topicsMatch = unitText.match(/Topics:\n((?:- .+(?:\n|$))+)/);
  if (!topicsMatch) return [];

  return topicsMatch[1]
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function parseUnitTitle(unitText: string): string {
  const match = unitText.match(/^Unit (\d+)/m);
  return match ? `Unit ${match[1]}` : "Unit";
}

function parsePeriod(unitText: string): Bimestre | null {
  const match = unitText.match(/^Period: (.+)$/m);
  if (!match) return null;
  return PERIOD_LABEL_TO_BIMESTRE[match[1].trim()] ?? null;
}

function parseUnits(fullText: string): Array<{ bimestre: Bimestre; unitTitle: string; rawContent: string }> {
  const sections = fullText
    .split(/\n={50,}\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  const units: Array<{ bimestre: Bimestre; unitTitle: string; rawContent: string }> = [];

  for (const section of sections) {
    if (!/^Unit \d/m.test(section)) continue;
    const bimestre = parsePeriod(section);
    if (!bimestre) continue;
    units.push({
      bimestre,
      unitTitle: parseUnitTitle(section),
      rawContent: section,
    });
  }

  return units;
}

function cardsFromPlanText(
  grade: number,
  subject: LessonPlanSubject,
  fullText: string,
): LessonPlanCard[] {
  const cards: LessonPlanCard[] = [];

  for (const unit of parseUnits(fullText)) {
    const topics = parseTopics(unit.rawContent);
    topics.forEach((title, index) => {
      cards.push({
        id: `${grade}-${subject}-${unit.bimestre}-${index}`,
        title,
        subject,
        bimestre: unit.bimestre,
        grade,
        unitTitle: unit.unitTitle,
        rawContent: unit.rawContent,
      });
    });
  }

  return cards;
}

async function loadSubjectPlan(grade: number, slug: string): Promise<string | null> {
  const filePath = planFilePath(grade, slug);
  const absolutePath = path.join(process.cwd(), filePath);

  try {
    const text = await readFile(absolutePath, "utf-8");
    return text.trim();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function getLessonPlansForGrade(grade: number): Promise<LessonPlansGradeData> {
  if (!isValidLessonPlanGrade(grade)) {
    throw new Error(`Invalid grade: ${grade}`);
  }

  const allCards: LessonPlanCard[] = [];

  for (const subject of LESSON_PLAN_SUBJECTS) {
    const slug = SUBJECT_FILE_SLUG[subject];
    if (!slug) continue;

    const text = await loadSubjectPlan(grade, slug);
    if (!text) continue;

    allCards.push(...cardsFromPlanText(grade, subject, text));
  }

  const bimestres: LessonPlansBimestreData[] = ([1, 2, 3, 4] as Bimestre[]).map((bimestre) => {
    const subjects = emptyBimestreSubjects();
    for (const subject of LESSON_PLAN_SUBJECTS) {
      subjects[subject] = allCards.filter(
        (card) => card.bimestre === bimestre && card.subject === subject,
      );
    }
    return { bimestre, subjects };
  });

  return { grade, bimestres };
}
