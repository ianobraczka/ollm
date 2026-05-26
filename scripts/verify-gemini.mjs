/**
 * Quick local check: GEMINI_API_KEY loads and Gemini API accepts requests.
 * Usage: node scripts/verify-gemini.mjs
 */
import { readFileSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

function loadKey() {
  const env = readFileSync(".env.local", "utf8");
  const line = env.split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
  if (!line) throw new Error("GEMINI_API_KEY missing in .env.local");
  return line.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const key = loadKey();
if (!key || key.includes("your_api_key")) {
  console.error("FAIL: Set a real GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: modelName });

try {
  const result = await model.generateContent("Reply with exactly: OK");
  console.log(`OK — model ${modelName}:`, result.response.text().trim());
} catch (error) {
  const status = error?.status;
  if (status === 401 || status === 403) {
    console.error("FAIL — invalid or unauthorized API key.");
  } else if (status === 429) {
    console.error(
      "KEY OK — Gemini reached, but quota/rate limit blocked the request (429).",
    );
    console.error("Check https://ai.google.dev/gemini-api/docs/rate-limits");
  } else {
    console.error("FAIL —", error?.message ?? error);
  }
  process.exit(status === 429 ? 0 : 1);
}
