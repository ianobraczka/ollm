import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in native/pdfjs assets; keep it external on the server bundle.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
