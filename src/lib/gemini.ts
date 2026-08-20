import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Free-tier Flash / Flash-Lite only (AI Studio, no billing required).
 * Preferred → fallback when a model is overloaded or retired.
 * Do not add Pro models here — they are typically paid-only.
 */
export const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
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

/** Retired / unknown model IDs should fall through to the next free Flash model. */
export function isRetiredModelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number((error as { status: unknown }).status) : NaN;
  const message = error instanceof Error ? error.message : String(error);
  if (status === 404) return true;
  return /no longer available|not found|is not found|not supported/i.test(message);
}

/** Network/TLS failures and retired models should try the next model in the chain. */
export function isRetryableGeminiFetchError(error: unknown): boolean {
  if (isModelUnavailableError(error) || isRetiredModelError(error)) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network/i.test(message);
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
      if (isRetryableGeminiFetchError(error)) {
        console.warn(
          `[gemini] ${modelName} failed, trying next model…`,
          error instanceof Error ? error.message : error,
        );
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
