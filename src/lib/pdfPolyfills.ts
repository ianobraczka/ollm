/**
 * pdfjs-dist (used by pdf-parse v2) expects browser globals in Node.
 * Load polyfills once before dynamically importing pdf-parse.
 */
export async function ensurePdfJsGlobals(): Promise<void> {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  const { default: DOMMatrix } = await import("dommatrix");
  globalThis.DOMMatrix = DOMMatrix as typeof globalThis.DOMMatrix;
}
