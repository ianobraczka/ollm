/**
 * Local Next.js with TLS verification disabled.
 * Needed on networks that intercept HTTPS with a corporate root CA
 * (Gemini fetch fails inside Next with "fetch failed" otherwise).
 *
 * Usage: npm run dev:insecure-tls
 */
import { spawn } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const child = spawn("npx", ["next", "dev", "-p", "3030"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
