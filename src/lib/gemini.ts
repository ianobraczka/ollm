import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Preferred → fallback chain when a model returns 503 (capacity).
 * Starts with the lightest model; escalates only on temporary unavailability.
 */
export const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

export function getModelChain(): string[] {
  const override = process.env.GEMINI_MODEL?.trim();
  if (!override) return [...DEFAULT_MODEL_CHAIN];

  const rest = DEFAULT_MODEL_CHAIN.filter((model) => model !== override);
  return [override, ...rest];
}

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to your environment variables.");
  }
  return new GoogleGenerativeAI(apiKey);
}

/** @deprecated Use generateContentStreamWithFallback instead. */
export function getGeminiModel() {
  const genAI = getGenAI();
  const [modelName] = getModelChain();
  return genAI.getGenerativeModel({ model: modelName });
}

export function isModelUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number((error as { status: unknown }).status) : NaN;
  // 503 = high demand; 529 = overloaded (same practical retry behavior).
  return status === 503 || status === 529;
}

export async function generateContentStreamWithFallback(prompt: string) {
  const genAI = getGenAI();
  const chain = getModelChain();
  let lastError: unknown;

  for (const modelName of chain) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContentStream(prompt);
      return { result, modelName };
    } catch (error) {
      if (isModelUnavailableError(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "All Gemini models are temporarily unavailable. Please try again later.";
  throw new Error(message);
}
