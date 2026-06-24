import fs from "node:fs";
import path from "node:path";

export const DEBUG_LOG_PATH = path.join(process.cwd(), "data", "schoology-debug.log");

function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function isSchoologyDebugEnabled(): boolean {
  const value = process.env.SCHOOLOGY_DEBUG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function schoologyDebugLog(
  step: string,
  data: Record<string, unknown>,
): void {
  if (!isSchoologyDebugEnabled()) {
    return;
  }

  ensureDataDir();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    step,
    ...data,
  });
  fs.appendFileSync(DEBUG_LOG_PATH, `${line}\n`, "utf8");
}
