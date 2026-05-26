import { MAX_CHARS_PER_DOCUMENT } from "@/lib/constants";

export type TruncationResult = {
  text: string;
  wasTruncated: boolean;
  originalLength: number;
  truncatedLength: number;
};

export function truncateDocument(text: string, maxChars: number = MAX_CHARS_PER_DOCUMENT): TruncationResult {
  const originalLength = text.length;
  if (originalLength <= maxChars) {
    return {
      text,
      wasTruncated: false,
      originalLength,
      truncatedLength: originalLength,
    };
  }

  const truncated = text.slice(0, maxChars);
  return {
    text: truncated,
    wasTruncated: true,
    originalLength,
    truncatedLength: truncated.length,
  };
}

