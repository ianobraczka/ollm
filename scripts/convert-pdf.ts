/**
 * Convert a PDF to UTF-8 plain text using pdf-parse (same stack as src/lib/parsePdf.ts).
 *
 * Usage:
 *   npm run convert-pdf -- input.pdf output.txt
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parsePdf } from "../src/lib/parsePdf";

function printUsage(): void {
  console.error("Usage: npm run convert-pdf -- <input.pdf> <output.txt>");
}

async function main(): Promise<void> {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    printUsage();
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);

  try {
    console.log(`Reading PDF: ${inputPath}`);
    const buffer = await readFile(inputPath);

    if (buffer.length === 0) {
      console.error("Failure: input file is empty.");
      process.exit(1);
    }

    console.log("Extracting text with pdf-parse…");
    const text = await parsePdf(buffer);

    if (!text.trim()) {
      console.error(
        "Failure: no text could be extracted. The PDF may be scanned/image-only or encrypted.",
      );
      process.exit(1);
    }

    const normalized = text.endsWith("\n") ? text : `${text}\n`;
    await writeFile(outputPath, normalized, "utf-8");

    console.log(`Success: extracted ${text.length} characters → ${outputPath}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.error(`Failure: file not found (${inputPath}).`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failure: ${message}`);
    }
    process.exit(1);
  }
}

main();
