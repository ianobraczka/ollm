import { fetchCurrentUser, normalizeApiArray, schoologyApiGet } from "@/lib/schoology/apiClient";
import { getSchoologyAppConfig, SCHOOLOGY_WEB_DOMAIN_DEFAULT } from "@/lib/schoology/config";
import type { SchoologyCoursesResult } from "@/types/schoology";

type SectionRecord = {
  id?: string | number;
  course_title?: string;
  section_title?: string;
  section?: string;
  course?: {
    title?: string;
  };
};

type UserSectionsResponse = {
  section?: SectionRecord[];
};

function parseSectionTitles(section: SectionRecord): {
  courseTitle: string;
  sectionTitle: string;
} {
  const courseTitle = section.course_title?.trim() || section.course?.title?.trim() || "";
  const sectionTitle = section.section_title?.trim() || section.section?.trim() || "";
  return { courseTitle, sectionTitle };
}

function buildSectionName(section: SectionRecord): string {
  const { courseTitle, sectionTitle } = parseSectionTitles(section);

  if (courseTitle && sectionTitle && courseTitle !== sectionTitle) {
    return `${courseTitle} — ${sectionTitle}`;
  }

  return sectionTitle || courseTitle || (section.id != null ? `Section ${section.id}` : "Untitled section");
}

export async function fetchTeacherCourses(): Promise<SchoologyCoursesResult> {
  const user = await fetchCurrentUser();

  const data = await schoologyApiGet<UserSectionsResponse>(`/users/${user.id}/sections`);
  const sections = normalizeApiArray(data.section);
  const appBase = getSchoologyAppConfig().webDomain.replace(/\/$/, "") || SCHOOLOGY_WEB_DOMAIN_DEFAULT;

  const courses = sections
    .filter((section) => section.id != null)
    .map((section) => {
      const id = String(section.id);
      const { courseTitle, sectionTitle } = parseSectionTitles(section);
      return {
        id,
        name: buildSectionName(section),
        ...(courseTitle ? { courseTitle } : {}),
        ...(sectionTitle ? { sectionTitle } : {}),
        url: `${appBase}/course/${id}`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    courses,
    extractedAt: new Date().toISOString(),
    user,
  };
}
