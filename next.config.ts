import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in native/pdfjs assets; keep it external on the server bundle.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth", "dommatrix"],

  // Built-in .txt files are read with fs at runtime; include them in the Vercel/serverless trace.
  outputFileTracingIncludes: {
    "/api/chat": ["./data/documents/**/*"],
  },
};

export default nextConfig;
