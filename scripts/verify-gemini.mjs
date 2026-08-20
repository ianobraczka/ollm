/**
 * Quick local check: GEMINI_API_KEY loads and Gemini API accepts requests.
 * Tries the same free-tier Flash fallback chain as the app (503/404 → next model).
 * Usage: node scripts/verify-gemini.mjs
 */
import { readFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

/** Free-tier Flash / Flash-Lite only (keep in sync with src/lib/gemini.ts). */
const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
];

function loadEnvLocal() {
  try {
    return readFileSync(".env.local", "utf8");
  } catch {
    throw new Error(".env.local not found");
  }
}

function readEnvValue(envText, key) {
  const line = envText.split("\n").find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  return line.slice(`${key}=`.length).trim().replace(/^["']|["']$/g, "");
}

function getChain(envText) {
  const override = (process.env.GEMINI_MODEL || readEnvValue(envText, "GEMINI_MODEL") || "").trim();
  if (!override) return [...DEFAULT_MODEL_CHAIN];
  return [override, ...DEFAULT_MODEL_CHAIN.filter((m) => m !== override)];
}

function isRetryable(error) {
  const status = error?.status;
  if (status === 503 || status === 529 || status === 404) return true;
  const message = String(error?.message ?? error ?? "");
  return /no longer available|not found|is not found|not supported|fetch failed|ECONNRESET|ETIMEDOUT|network/i.test(
    message,
  );
}

const envText = loadEnvLocal();
const key = process.env.GEMINI_API_KEY || readEnvValue(envText, "GEMINI_API_KEY");
if (!key || key.includes("your_api_key")) {
  console.error("FAIL: Set a real GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);
const chain = getChain(envText);
console.log("Trying free-tier chain:", chain.join(" → "));

let lastError;

for (const modelName of chain) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Reply with exactly: OK");
    console.log(`OK — model ${modelName}:`, result.response.text().trim());
    process.exit(0);
  } catch (error) {
    lastError = error;
    const status = error?.status;
    if (status === 401 || status === 403) {
      console.error("FAIL — invalid or unauthorized API key.");
      process.exit(1);
    }
    if (status === 429) {
      console.error(
        `KEY OK — ${modelName} reached quota/rate limit (429). Try again later or another model.`,
      );
      process.exit(0);
    }
    if (isRetryable(error)) {
      console.warn(`Retryable failure on ${modelName}, trying next model…`, error?.message ?? error);
      continue;
    }
    console.error(`FAIL on ${modelName} —`, error?.message ?? error);
    process.exit(1);
  }
}

console.error("FAIL — all models unavailable:", lastError?.message ?? lastError);
process.exit(1);
