import {
  fetchAssignmentApiDetails,
  fetchAssignmentSubmissions,
} from "@/lib/schoology/assignmentSubmissions";
import { fetchAssignmentRubric } from "@/lib/schoology/assignmentRubric";
import { normalizeApiArray, schoologyApiGet } from "@/lib/schoology/apiClient";
import { SchoologyApiError, SchoologyPageNotFoundError } from "@/lib/schoology/errors";
import {
  buildAssessmentUrl,
  resolveAssessmentUrl,
  type SchoologyMaterialType,
} from "@/lib/schoology/schoologyUrls";
import type { SchoologyAssessmentData, SchoologyAssessmentItem } from "@/types/schoology";

export { SchoologyPageNotFoundError };

type GradeItemRecord = {
  id?: string | number;
  title?: string;
  type?: string;
  description?: string;
  max_points?: string | number;
  due?: string;
};

type GradeItemsResponse = {
  grade_item?: GradeItemRecord[];
};

type TestQuestionRecord = {
  id?: string | number;
  title?: string;
  type?: string;
  points?: string | number;
  text?: string;
  question?: string;
};

type TestDetailResponse = {
  id?: string | number;
  title?: string;
  description?: string;
  max_points?: string | number;
  due?: string;
  question?: TestQuestionRecord[] | { question?: TestQuestionRecord[] };
};

function normalizeQuestions(raw: TestDetailResponse | null | undefined): SchoologyAssessmentItem[] {
  const questions = normalizeApiArray(
    Array.isArray(raw?.question) ? raw.question : raw?.question?.question,
  );

  return questions.map((question, index) => ({
    index: index + 1,
    title: question.title?.trim() || undefined,
    type: question.type?.trim() || undefined,
    points: question.points != null ? String(question.points) : undefined,
    text: (question.text ?? question.question)?.trim().slice(0, 2000) || undefined,
  }));
}

async function fetchTestAssessment(
  sectionId: string,
  assessmentId: string,
): Promise<SchoologyAssessmentData> {
  const url = buildAssessmentUrl(sectionId, assessmentId, "test");

  let testData: TestDetailResponse | null = null;
  try {
    testData = await schoologyApiGet<TestDetailResponse>(
      `/sections/${sectionId}/tests/${assessmentId}`,
    );
  } catch (error) {
    if (error instanceof SchoologyApiError && error.status === 404) {
      const gradeItems = await schoologyApiGet<GradeItemsResponse>(
        `/sections/${sectionId}/grade_items`,
      );
      const match = normalizeApiArray(gradeItems.grade_item).find(
        (item) => String(item.id) === assessmentId,
      );
      if (!match) {
        throw new SchoologyPageNotFoundError(
          `Test or quiz ${assessmentId} was not found in section ${sectionId}.`,
        );
      }

      return {
        title: match.title?.trim(),
        url,
        sectionId,
        assessmentId,
        materialType: "test",
        maxPoints: match.max_points != null ? String(match.max_points) : undefined,
        dueDate: match.due?.trim(),
        description: match.description?.trim(),
        questions: [],
        submissions: [],
        links: [{ text: "Open in Schoology", href: url }],
        rawPageText: [match.title, match.description].filter(Boolean).join("\n\n"),
        extractedAt: new Date().toISOString(),
      };
    }
    throw error;
  }

  const description = testData.description?.trim();
  const title = testData.title?.trim();

  return {
    title,
    url,
    sectionId,
    assessmentId,
    materialType: "test",
    maxPoints: testData.max_points != null ? String(testData.max_points) : undefined,
    dueDate: testData.due?.trim(),
    description,
    questions: normalizeQuestions(testData),
    submissions: [],
    links: [{ text: "Open in Schoology", href: url }],
    rawPageText: [title, description].filter(Boolean).join("\n\n"),
    extractedAt: new Date().toISOString(),
  };
}

export async function fetchAssessmentData(
  sectionId: string,
  assessmentId: string,
  materialType: SchoologyMaterialType = "assignment",
  urlOverride?: string,
): Promise<SchoologyAssessmentData> {
  const trimmedSectionId = sectionId.trim();
  const trimmedAssessmentId = assessmentId.trim();
  const url = resolveAssessmentUrl(
    trimmedSectionId,
    trimmedAssessmentId,
    materialType,
    urlOverride,
  );

  if (materialType === "test") {
    if (!trimmedSectionId) {
      throw new SchoologyPageNotFoundError(
        "Section ID is required to retrieve test or quiz materials via the Schoology API.",
      );
    }
    return fetchTestAssessment(trimmedSectionId, trimmedAssessmentId);
  }

  if (!trimmedSectionId) {
    throw new SchoologyPageNotFoundError(
      "Section ID is required to retrieve assignment data via the Schoology API.",
    );
  }

  let apiDetails: Awaited<ReturnType<typeof fetchAssignmentApiDetails>> = null;

  try {
    apiDetails = await fetchAssignmentApiDetails(trimmedSectionId, trimmedAssessmentId);
  } catch (error) {
    if (error instanceof SchoologyApiError && error.status === 404) {
      throw new SchoologyPageNotFoundError(
        `Assignment ${trimmedAssessmentId} was not found in section ${trimmedSectionId}.`,
      );
    }
    throw error;
  }

  if (!apiDetails) {
    throw new SchoologyPageNotFoundError(
      `Assignment ${trimmedAssessmentId} was not found in section ${trimmedSectionId}.`,
    );
  }

  const [submissions, rubric] = await Promise.all([
    fetchAssignmentSubmissions(trimmedSectionId, trimmedAssessmentId).catch(() => []),
    fetchAssignmentRubric(trimmedSectionId, trimmedAssessmentId).catch(() => null),
  ]);

  const description = apiDetails?.description;
  const title = apiDetails?.title;

  return {
    title,
    url,
    sectionId: trimmedSectionId,
    assessmentId: trimmedAssessmentId,
    materialType,
    dueDate: apiDetails?.due,
    maxPoints: apiDetails?.maxPoints,
    description,
    rubric: rubric ?? undefined,
    questions: [],
    submissions,
    links: [{ text: "Open in Schoology", href: url }],
    rawPageText: [title, description].filter(Boolean).join("\n\n"),
    extractedAt: new Date().toISOString(),
  };
}
