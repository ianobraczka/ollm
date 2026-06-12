export type UnitDetailSection = {
  key: string;
  titleKey:
    | "sectionBigIdea"
    | "sectionTopics"
    | "sectionLearningObjectives"
    | "sectionBnccSkills"
    | "sectionKeywords"
    | "sectionProjectOpportunities"
    | "sectionAssessment";
  content: string;
};

const SECTION_PATTERNS: Array<{
  key: string;
  titleKey: UnitDetailSection["titleKey"];
  header: string;
}> = [
  { key: "bigIdea", titleKey: "sectionBigIdea", header: "Big Idea:" },
  { key: "topics", titleKey: "sectionTopics", header: "Topics:" },
  { key: "objectives", titleKey: "sectionLearningObjectives", header: "Learning Objectives:" },
  { key: "bncc", titleKey: "sectionBnccSkills", header: "BNCC Skills:" },
  { key: "keywords", titleKey: "sectionKeywords", header: "Keywords:" },
  { key: "projects", titleKey: "sectionProjectOpportunities", header: "Project Opportunities:" },
  { key: "assessment", titleKey: "sectionAssessment", header: "Assessment Suggestions:" },
];

export function parseUnitDetail(rawContent: string): UnitDetailSection[] {
  const sections: UnitDetailSection[] = [];

  for (let i = 0; i < SECTION_PATTERNS.length; i++) {
    const current = SECTION_PATTERNS[i];
    const start = rawContent.indexOf(current.header);
    if (start === -1) continue;

    const contentStart = start + current.header.length;
    let contentEnd = rawContent.length;

    for (let j = i + 1; j < SECTION_PATTERNS.length; j++) {
      const nextIndex = rawContent.indexOf(SECTION_PATTERNS[j].header, contentStart);
      if (nextIndex !== -1) {
        contentEnd = nextIndex;
        break;
      }
    }

    const content = rawContent.slice(contentStart, contentEnd).trim();
    if (content) {
      sections.push({ key: current.key, titleKey: current.titleKey, content });
    }
  }

  return sections;
}
