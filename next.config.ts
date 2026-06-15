import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in native/pdfjs assets; keep it external on the server bundle.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth", "dommatrix"],

  async redirects() {
    return [
      {
        source: "/lesson-plans",
        destination: "/lesson-map",
        permanent: true,
      },
      {
        source: "/api/lesson-plans",
        destination: "/api/lesson-map",
        permanent: true,
      },
    ];
  },

  // Built-in .txt files are read with fs at runtime; include them in the Vercel/serverless trace.
  outputFileTracingIncludes: {
    "/api/chat": [
      "./data/documents/**/*",
      "./data/plans/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
    "/api/interdisciplinary": ["./data/plans/**/*", "./data/documents/**/*"],
    "/api/lesson-map": ["./data/plans/**/*"],
    "/api/parse": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    ],
  },
};

export default nextConfig;
