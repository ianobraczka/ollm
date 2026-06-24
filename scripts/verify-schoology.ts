/**
 * Quick local check: Schoology two-legged OAuth credentials work.
 * Usage: npm run verify:schoology
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvFile(filename: string) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const { getSchoologyCurrentUser, getSchoologyConfig } = await import(
    "../src/lib/schoology/client"
  );

  const config = getSchoologyConfig();
  if (!config.ok) {
    console.error("FAIL:", config.message);
    process.exit(1);
  }

  const session = await getSchoologyCurrentUser();
  if (!session.connected) {
    console.error("FAIL:", session.error);
    if (session.status) console.error("HTTP status:", session.status);
    process.exit(1);
  }

  const name = session.user.name_display ?? session.user.name ?? session.user.username ?? "unknown";
  console.log(`OK — connected as ${name} (id: ${session.user.id ?? session.user.uid ?? "?"})`);
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
