export type BuiltInDocument = {
  id: string;
  title: string;
  description: string;
  /** Path relative to project root, e.g. data/documents/bncc.txt */
  filePath: string;
};

export const BUILT_IN_DOCUMENTS: BuiltInDocument[] = [
  {
    id: "bncc",
    title: "BNCC",
    description: "Brazilian National Common Curriculum Base (Base Nacional Comum Curricular).",
    filePath: "data/documents/bncc.txt",
  },
  {
    id: "massachusetts-framework",
    title: "Massachusetts Curriculum Framework",
    description: "Massachusetts Curriculum Framework for ELA, literacy, and mathematics.",
    filePath: "data/documents/massachusetts-framework.txt",
  },
];

const byId = new Map(BUILT_IN_DOCUMENTS.map((doc) => [doc.id, doc]));

export function getBuiltInDocument(id: string): BuiltInDocument | undefined {
  return byId.get(id);
}

export function isBuiltInDocumentId(id: string): boolean {
  return byId.has(id);
}
