import { buildOAuth1AuthorizationHeader } from "@/lib/schoology/oauth1";

const DEFAULT_BASE_URL = "https://api.schoology.com/v1";

export type SchoologyConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

export type SchoologyConfigResult =
  | { ok: true; config: SchoologyConfig }
  | { ok: false; message: string; missing: string[] };

export type SchoologyUser = {
  id?: string;
  uid?: string;
  name?: string;
  name_display?: string;
  username?: string;
  primary_email?: string;
  role_id?: string;
  school_id?: string;
};

export type SchoologyAppUserInfoResponse = {
  api_uid?: number | string;
  web_session_timestamp?: number;
};

export type SchoologyUserResponse = SchoologyUser & {
  id?: number | string;
};

export type SchoologyRequestError = {
  ok: false;
  status: number;
  message: string;
  code?: string;
};

export type SchoologyRequestSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export function getSchoologyConfig(): SchoologyConfigResult {
  const baseUrl = (process.env.SCHOOLOGY_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  const consumerKey = process.env.SCHOOLOGY_CONSUMER_KEY?.trim() ?? "";
  const consumerSecret = process.env.SCHOOLOGY_CONSUMER_SECRET?.trim() ?? "";

  const missing: string[] = [];
  if (!consumerKey) missing.push("SCHOOLOGY_CONSUMER_KEY");
  if (!consumerSecret) missing.push("SCHOOLOGY_CONSUMER_SECRET");

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing Schoology credentials: ${missing.join(", ")}. Add them to .env.local.`,
      missing,
    };
  }

  return {
    ok: true,
    config: { baseUrl, consumerKey, consumerSecret },
  };
}

function resolveUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function safeErrorMessage(status: number, body: unknown, rawText?: string): string {
  if (status === 401) return "Schoology rejected the API credentials (401 Unauthorized).";
  if (status === 403) return "Schoology denied access for these credentials (403 Forbidden).";
  if (status === 404) return "Schoology endpoint not found (404).";
  if (status >= 500) return `Schoology API unavailable (${status}).`;

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.error_description;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  if (rawText?.trim()) {
    return rawText.trim().slice(0, 200);
  }

  return `Schoology API request failed (${status}).`;
}

export async function schoologyRequest<T>(
  path: string,
  options: { method?: string } = {},
): Promise<SchoologyRequestSuccess<T> | SchoologyRequestError> {
  const configResult = getSchoologyConfig();
  if (!configResult.ok) {
    return { ok: false, status: 0, message: configResult.message, code: "missing_credentials" };
  }

  const config = configResult.config;

  const method = (options.method ?? "GET").toUpperCase();
  const url = resolveUrl(config.baseUrl, path);
  const parsedUrl = new URL(url);

  const authorization = buildOAuth1AuthorizationHeader({
    method,
    url,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network error contacting Schoology API.";
    console.error(
      `[schoology] ${method} ${parsedUrl.hostname}${parsedUrl.pathname} → network error`,
    );
    return { ok: false, status: 0, message, code: "network_error" };
  }

  console.log(
    `[schoology] ${method} ${parsedUrl.hostname}${parsedUrl.pathname} → ${response.status}`,
  );

  const rawText = await response.text();
  let body: unknown = null;
  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: safeErrorMessage(response.status, body, rawText),
      code: "api_error",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: (body ?? {}) as T,
  };
}

export async function getSchoologyCurrentUser(): Promise<
  | { connected: true; user: SchoologyUser; status: number }
  | { connected: false; error: string; status: number; code?: string }
> {
  // /users/me is unreliable for two-legged OAuth; use app-user-info → users/{uid}.
  const appInfo = await schoologyRequest<SchoologyAppUserInfoResponse>("/app-user-info");

  if (!appInfo.ok) {
    return {
      connected: false,
      error: appInfo.message,
      status: appInfo.status,
      code: appInfo.code,
    };
  }

  const apiUid = appInfo.data.api_uid;
  if (apiUid === undefined || apiUid === null || String(apiUid).trim() === "") {
    return {
      connected: false,
      error: "Schoology connected but no API user id was returned.",
      status: appInfo.status,
      code: "empty_profile",
    };
  }

  const profile = await schoologyRequest<SchoologyUserResponse>(`/users/${apiUid}`);

  if (!profile.ok) {
    return {
      connected: false,
      error: profile.message,
      status: profile.status,
      code: profile.code,
    };
  }

  const user = profile.data;
  if (!user.uid && !user.id) {
    return {
      connected: false,
      error: "Schoology responded successfully but no user profile was returned.",
      status: profile.status,
      code: "empty_profile",
    };
  }

  return {
    connected: true,
    user,
    status: profile.status,
  };
}
