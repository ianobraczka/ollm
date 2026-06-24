const ALLOWED_HOST_PATTERN = /(?:^|\.)schoology\.com$/i;

export function isAllowedSchoologyFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function buildProxiedFileUrl(downloadPath: string, filename: string): string {
  const params = new URLSearchParams({
    url: downloadPath,
    filename,
  });
  return `/api/assessment-assistant/file?${params.toString()}`;
}
