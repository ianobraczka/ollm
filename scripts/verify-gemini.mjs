/**
 * Quick local check: GEMINI_API_KEY loads and Gemini API accepts requests.
 * Tries the same fallback chain as the app (503 → next model).
 * Usage: node scripts/verify-gemini.mjs
 */
import { readFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

function loadKey() {
  const env = readFileSync(".env.local", "utf8");
  const line = env.split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
  if (!line) throw new Error("GEMINI_API_KEY missing in .env.local");
  return line.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

function getChain() {
  const override = process.env.GEMINI_MODEL?.trim();
  if (!override) return [...DEFAULT_MODEL_CHAIN];
  return [override, ...DEFAULT_MODEL_CHAIN.filter((m) => m !== override)];
}

function isUnavailable(error) {
  return error?.status === 503 || error?.status === 529;
}

const key = loadKey();
if (!key || key.includes("your_api_key")) {
  console.error("FAIL: Set a real GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);
const chain = getChain();
let lastError;

for (const modelName of chain) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Reply with exactly: OK");
    console.log(`OK — model ${modelName}:`, result.response.text().trim());
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (isUnavailable(error)) {
      console.warn(`503/unavailable on ${modelName}, trying next model…`);
      continue;
    }
    const status = error?.status;
    if (status === 401 || status === 403) {
      console.error("FAIL — invalid or unauthorized API key.");
    } else if (status === 429) {
      console.error(
        `KEY OK — ${modelName} reached quota/rate limit (429). Try again later or another model.`,
      );
      process.exit(0);
    } else {
      console.error(`FAIL on ${modelName} —`, error?.message ?? error);
    }
    process.exit(1);
  }
}

console.error("FAIL — all models unavailable:", lastError?.message ?? lastError);
process.exit(1);
