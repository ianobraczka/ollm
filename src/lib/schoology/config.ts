import { SchoologyConfigError } from "@/lib/schoology/errors";

/** Schoology REST API host — never use www or app for API requests. */
export const SCHOOLOGY_API_HOST = "api.schoology.com";

const DEFAULT_SCHOOLOGY_BASE_URL = `https://${SCHOOLOGY_API_HOST}/v1`;

/** Default host for Schoology web UI deep links (not the REST API). */
export const SCHOOLOGY_WEB_DOMAIN_DEFAULT = "https://app.schoology.com";

export type SchoologyApiRequestTarget = {
  hostname: string;
  path: string;
};

function parseSchoologyApiBase(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SchoologyConfigError(
      `SCHOOLOGY_BASE_URL is not a valid URL. Use https://${SCHOOLOGY_API_HOST}/v1`,
    );
  }

  if (parsed.hostname !== SCHOOLOGY_API_HOST) {
    throw new SchoologyConfigError(
      `SCHOOLOGY_BASE_URL must use hostname ${SCHOOLOGY_API_HOST} (got "${parsed.hostname}"). ` +
        "Do not use www.schoology.com or app.schoology.com for API requests.",
    );
  }

  if (parsed.protocol !== "https:") {
    throw new SchoologyConfigError("SCHOOLOGY_BASE_URL must use https.");
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/v1`;
}

/** Resolved REST API base from SCHOOLOGY_BASE_URL (defaults to https://api.schoology.com/v1). */
export function getSchoologyApiBase(): string {
  const raw = process.env.SCHOOLOGY_BASE_URL?.trim() || DEFAULT_SCHOOLOGY_BASE_URL;
  return parseSchoologyApiBase(raw);
}

/** Build a Schoology REST API URL — always targets api.schoology.com. */
export function buildSchoologyApiUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getSchoologyApiBase()}${normalizedPath}`);

  if (url.hostname !== SCHOOLOGY_API_HOST) {
    throw new SchoologyConfigError(
      `Internal error: Schoology API URL resolved to unexpected host "${url.hostname}".`,
    );
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export function describeSchoologyApiRequest(requestUrl: string): SchoologyApiRequestTarget {
  const parsed = new URL(requestUrl);
  return {
    hostname: parsed.hostname,
    path: `${parsed.pathname}${parsed.search}`,
  };
}

export type SchoologyConfig = {
  consumerKey: string;
  consumerSecret: string;
  webDomain: string;
};

export function normalizeSchoologyWebDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) {
    return SCHOOLOGY_WEB_DOMAIN_DEFAULT;
  }

  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function getSchoologyAppConfig(): SchoologyConfig {
  const consumerKey = process.env.SCHOOLOGY_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.SCHOOLOGY_CONSUMER_SECRET?.trim();

  if (!consumerKey || !consumerSecret) {
    throw new SchoologyConfigError(
      "Schoology API credentials are missing. Set SCHOOLOGY_CONSUMER_KEY and SCHOOLOGY_CONSUMER_SECRET in .env.local.",
    );
  }

  const webDomain = normalizeSchoologyWebDomain(
    process.env.SCHOOLOGY_DOMAIN?.trim() || SCHOOLOGY_WEB_DOMAIN_DEFAULT,
  );

  return {
    consumerKey,
    consumerSecret,
    webDomain,
  };
}

/** @deprecated Use SCHOOLOGY_WEB_DOMAIN_DEFAULT */
export const SCHOOLOGY_OAUTH_DOMAIN_DEFAULT = SCHOOLOGY_WEB_DOMAIN_DEFAULT;
