import { fetchCurrentUser, normalizeApiArray, schoologyApiGet } from "@/lib/schoology/apiClient";
import { getSchoologyAppConfig, SCHOOLOGY_WEB_DOMAIN_DEFAULT } from "@/lib/schoology/config";
import type { SchoologyCourse, SchoologyCoursesResult } from "@/types/schoology";

type SectionRecord = {
  id?: string | number;
  course_title?: string;
  section_title?: string;
  section?: string;
  active?: number | string | boolean;
  course?: {
    title?: string;
  };
};

type UserSectionsResponse = {
  section?: SectionRecord | SectionRecord[];
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

  return (
    sectionTitle ||
    courseTitle ||
    (section.id != null ? `Section ${section.id}` : "Untitled section")
  );
}

function isExplicitlyInactive(section: SectionRecord): boolean {
  return section.active === 0 || section.active === "0" || section.active === false;
}

function isExplicitlyActive(section: SectionRecord): boolean {
  return section.active === 1 || section.active === "1" || section.active === true;
}

function isSectionArchived(section: SectionRecord, currentIds: Set<string>): boolean {
  if (isExplicitlyInactive(section)) {
    return true;
  }
  if (isExplicitlyActive(section)) {
    return false;
  }
  if (section.id == null) {
    return false;
  }
  return !currentIds.has(String(section.id));
}

function mapSectionToCourse(
  section: SectionRecord,
  appBase: string,
  currentIds: Set<string>,
): SchoologyCourse | null {
  if (section.id == null) {
    return null;
  }

  const id = String(section.id);
  const { courseTitle, sectionTitle } = parseSectionTitles(section);

  return {
    id,
    name: buildSectionName(section),
    ...(courseTitle ? { courseTitle } : {}),
    ...(sectionTitle ? { sectionTitle } : {}),
    url: `${appBase}/course/${id}`,
    isArchived: isSectionArchived(section, currentIds),
  };
}

export async function fetchTeacherCourses(): Promise<SchoologyCoursesResult> {
  const user = await fetchCurrentUser();
  const appBase =
    getSchoologyAppConfig().webDomain.replace(/\/$/, "") || SCHOOLOGY_WEB_DOMAIN_DEFAULT;

  const [currentData, allData] = await Promise.all([
    schoologyApiGet<UserSectionsResponse>(`/users/${user.id}/sections`),
    schoologyApiGet<UserSectionsResponse>(`/users/${user.id}/sections`, {
      query: { include_past: 1 },
    }).catch(() => null),
  ]);

  const currentSections = normalizeApiArray(currentData.section);
  const currentIds = new Set(
    currentSections
      .filter((section) => section.id != null)
      .map((section) => String(section.id)),
  );

  const pastInclusiveSections = allData
    ? normalizeApiArray(allData.section)
    : currentSections;

  const byId = new Map<string, SectionRecord>();
  for (const section of [...currentSections, ...pastInclusiveSections]) {
    if (section.id == null) {
      continue;
    }
    byId.set(String(section.id), section);
  }

  const courses = Array.from(byId.values())
    .map((section) => mapSectionToCourse(section, appBase, currentIds))
    .filter((course): course is SchoologyCourse => course != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    courses,
    extractedAt: new Date().toISOString(),
    user,
  };
}
