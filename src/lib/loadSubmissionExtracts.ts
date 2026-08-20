import { parseDocx, parseTxt } from "@/lib/parsers";
import { fetchAssessmentData } from "@/lib/schoology/assessmentService";
import { schoologyApiFetchAbsolute } from "@/lib/schoology/apiClient";
import { isAllowedSchoologyFileUrl } from "@/lib/schoology/schoologyFileUrls";
import type { SchoologySubmission, SchoologySubmissionFile } from "@/types/schoology";

const MAX_CHARS_PER_STUDENT = 2_500;
const MAX_FILES_PER_STUDENT = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_STUDENTS = 40;
const CACHE_TTL_MS = 30 * 60 * 1000;

export type SubmissionExtractMetrics = {
  wordCount: number;
  fileCount: number;
  totalBytes: number;
  extractableFiles: number;
  extractedFiles: number;
  late: boolean;
  score?: string;
  gradeLetter?: string;
  submittedAt?: string;
};

export type StudentSubmissionExtract = {
  userId?: string;
  studentName?: string;
  metrics: SubmissionExtractMetrics;
  bodyText?: string;
  fileExtracts: Array<{
    filename: string;
    text?: string;
    note?: string;
  }>;
  combinedText: string;
};

type CacheEntry = {
  expiresAt: number;
  extracts: StudentSubmissionExtract[];
  assignmentTitle?: string;
};

const extractCache = new Map<string, CacheEntry>();

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches?.length ?? 0;
}

function resolveDownloadPath(file: SchoologySubmissionFile): string | undefined {
  if (file.downloadPath && isAllowedSchoologyFileUrl(file.downloadPath)) {
    return file.downloadPath;
  }

  const proxyUrl = file.url?.trim();
  if (!proxyUrl) {
    return undefined;
  }

  try {
    const parsed = proxyUrl.startsWith("http")
      ? new URL(proxyUrl)
      : new URL(proxyUrl, "http://localhost");
    const nested = parsed.searchParams.get("url")?.trim();
    if (nested && isAllowedSchoologyFileUrl(nested)) {
      return nested;
    }
  } catch {
    // ignore
  }

  if (isAllowedSchoologyFileUrl(proxyUrl)) {
    return proxyUrl;
  }

  return undefined;
}

function isExtractableFile(file: SchoologySubmissionFile): boolean {
  const name = (file.filename || file.title || "").toLowerCase();
  const mime = (file.filemime || "").toLowerCase();
  return (
    mime.includes("pdf") ||
    name.endsWith(".pdf") ||
    mime.includes("wordprocessingml") ||
    name.endsWith(".docx") ||
    mime.startsWith("text/") ||
    name.endsWith(".txt")
  );
}

async function downloadFileBuffer(downloadPath: string): Promise<{
  buffer: Buffer;
  contentType?: string;
} | null> {
  let response = await schoologyApiFetchAbsolute(downloadPath);

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) {
      response = await schoologyApiFetchAbsolute(new URL(location, downloadPath).toString());
    }
  }

  if (!response.ok) {
    return null;
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
    return null;
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

async function extractFileText(file: SchoologySubmissionFile): Promise<{
  text?: string;
  note?: string;
  bytes?: number;
}> {
  if (!isExtractableFile(file)) {
    return { note: "Unsupported file type for text extraction." };
  }

  const downloadPath = resolveDownloadPath(file);
  if (!downloadPath) {
    return { note: "No downloadable file URL." };
  }

  try {
    const downloaded = await downloadFileBuffer(downloadPath);
    if (!downloaded) {
      return { note: "File download failed or file too large." };
    }

    const name = (file.filename || file.title || "file").toLowerCase();
    const mime = (file.filemime || downloaded.contentType || "").toLowerCase();

    let text = "";
    if (mime.includes("pdf") || name.endsWith(".pdf")) {
      const { parsePdf } = await import("@/lib/parsePdf");
      text = await parsePdf(downloaded.buffer);
    } else if (mime.includes("wordprocessingml") || name.endsWith(".docx")) {
      text = await parseDocx(downloaded.buffer);
    } else if (mime.startsWith("text/") || name.endsWith(".txt")) {
      text = await parseTxt(downloaded.buffer);
    } else {
      return { note: "Unsupported file type for text extraction.", bytes: downloaded.buffer.length };
    }

    const cleaned = text.trim();
    if (!cleaned) {
      return { note: "No extractable text found.", bytes: downloaded.buffer.length };
    }

    return { text: cleaned, bytes: downloaded.buffer.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed.";
    return { note: message };
  }
}

function truncateCombined(parts: string[], maxChars: number): string {
  const joined = parts.filter(Boolean).join("\n\n").trim();
  if (joined.length <= maxChars) {
    return joined;
  }
  return `${joined.slice(0, maxChars).trim()}…`;
}

async function buildStudentExtract(
  submission: SchoologySubmission,
): Promise<StudentSubmissionExtract> {
  const bodyText = submission.body ? stripHtml(submission.body) : undefined;
  const files = submission.files.slice(0, MAX_FILES_PER_STUDENT);
  const extractableFiles = submission.files.filter(isExtractableFile).length;

  const fileExtracts: StudentSubmissionExtract["fileExtracts"] = [];
  let totalBytes = 0;

  for (const file of files) {
    const result = await extractFileText(file);
    if (result.bytes) {
      totalBytes += result.bytes;
    }
    fileExtracts.push({
      filename: file.filename || file.title || "File",
      text: result.text,
      note: result.note,
    });
  }

  for (const file of submission.files.slice(MAX_FILES_PER_STUDENT)) {
    totalBytes += file.filesize ?? 0;
  }

  const textParts: string[] = [];
  if (bodyText) {
    textParts.push(`Inline submission:\n${bodyText}`);
  }
  for (const file of fileExtracts) {
    if (file.text) {
      textParts.push(`File "${file.filename}":\n${file.text}`);
    }
  }

  const combinedText = truncateCombined(textParts, MAX_CHARS_PER_STUDENT);
  const wordCount = countWords(combinedText);

  return {
    userId: submission.userId,
    studentName: submission.studentName,
    metrics: {
      wordCount,
      fileCount: submission.files.length,
      totalBytes,
      extractableFiles,
      extractedFiles: fileExtracts.filter((f) => Boolean(f.text)).length,
      late: Boolean(submission.late),
      score: submission.score,
      gradeLetter: submission.gradeLetter,
      submittedAt: submission.submittedAt,
    },
    bodyText,
    fileExtracts,
    combinedText,
  };
}

export async function loadSubmissionExtracts(
  sectionId: string,
  assignmentId: string,
  options?: {
    submissions?: SchoologySubmission[];
    assignmentTitle?: string;
  },
): Promise<{
  assignmentTitle?: string;
  extracts: StudentSubmissionExtract[];
  fromCache: boolean;
}> {
  const cacheKey = `${sectionId}:${assignmentId}`;
  const cached = extractCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      assignmentTitle: cached.assignmentTitle,
      extracts: cached.extracts,
      fromCache: true,
    };
  }

  let assignmentTitle = options?.assignmentTitle;
  let submissions = options?.submissions;

  if (!submissions) {
    const assessment = await fetchAssessmentData(sectionId, assignmentId, "assignment");
    assignmentTitle = assessment.title;
    submissions = assessment.submissions;
  }

  const selected = submissions.filter((submission) => !submission.draft).slice(0, MAX_STUDENTS);

  const extracts: StudentSubmissionExtract[] = [];
  for (const submission of selected) {
    extracts.push(await buildStudentExtract(submission));
  }

  extracts.sort((a, b) => b.metrics.wordCount - a.metrics.wordCount);

  extractCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    extracts,
    assignmentTitle,
  });

  return {
    assignmentTitle,
    extracts,
    fromCache: false,
  };
}

export function serializeSubmissionExtracts(
  extracts: StudentSubmissionExtract[],
  assignmentTitle?: string,
): string {
  if (extracts.length === 0) {
    return "[No student submissions with extractable content were found for this assignment.]";
  }

  const lines: string[] = [
    `Submission extracts for comparative analysis${assignmentTitle ? ` — ${assignmentTitle}` : ""}`,
    `Students included: ${extracts.length}`,
    "Judge effort and quality from the metrics and extracted text below — do not use grades alone.",
    "Prefer depth, completeness, specificity, and evidence of revision/thought over score.",
    "",
  ];

  for (const extract of extracts) {
    const label = extract.studentName ?? extract.userId ?? "Unknown student";
    const m = extract.metrics;
    const meta = [
      `${m.wordCount} words extracted`,
      `${m.fileCount} file(s)`,
      m.extractedFiles > 0 ? `${m.extractedFiles} text extract(s)` : null,
      m.late ? "late" : null,
      m.gradeLetter ? `grade ${m.gradeLetter}` : null,
      m.score ? `score ${m.score}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push(`### ${label}`);
    lines.push(`Metrics: ${meta}`);

    if (extract.combinedText.trim()) {
      lines.push("Extracted work:");
      lines.push(extract.combinedText.trim());
    } else {
      const notes = extract.fileExtracts
        .map((f) => (f.note ? `${f.filename}: ${f.note}` : null))
        .filter(Boolean);
      lines.push(
        notes.length > 0
          ? `No extractable text. Notes: ${notes.join("; ")}`
          : "No extractable text available for this submission.",
      );
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}
