import "server-only";

import { buildOAuth1AuthorizationHeader } from "@/lib/schoology/oauth1";
import {
  buildSchoologyApiUrl,
  describeSchoologyApiRequest,
  getSchoologyApiBase,
} from "@/lib/schoology/config";
import { logSchoologyApiError, logSchoologyApiRequest } from "@/lib/schoology/apiLog";
import { buildAuthFailureMessage } from "@/lib/schoology/diagnostics";
import {
  SchoologyApiError,
  SchoologyAuthError,
  SchoologyConfigError,
} from "@/lib/schoology/errors";

export {
  getSchoologyConfig,
  getSchoologyCurrentUser,
  schoologyRequest,
  type SchoologyAppUserInfoResponse,
  type SchoologyConfig,
  type SchoologyConfigResult,
  type SchoologyRequestError,
  type SchoologyRequestSuccess,
  type SchoologyUser,
  type SchoologyUserResponse,
} from "@/lib/schoology/client";

import { getSchoologyConfig, getSchoologyCurrentUser } from "@/lib/schoology/client";

type ApiRequestOptions = {
  query?: Record<string, string | number | boolean | undefined>;
};

function requireClientConfig() {
  const configResult = getSchoologyConfig();
  if (!configResult.ok) {
    throw new SchoologyConfigError(configResult.message);
  }
  return configResult.config;
}

function buildAuthorization(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
): string {
  return buildOAuth1AuthorizationHeader({
    method,
    url,
    consumerKey,
    consumerSecret,
  });
}

async function parseApiResponse<T>(
  response: Response,
  method: string,
  requestUrl: string,
): Promise<T> {
  if (response.status === 401 || response.status === 403) {
    const body = await response.text().catch(() => "");
    logSchoologyApiError(method, requestUrl, response.status, body);
    throw new SchoologyAuthError(buildAuthFailureMessage(response.status, body));
  }

  if (response.status === 404) {
    const body = await response.text().catch(() => "");
    logSchoologyApiError(method, requestUrl, response.status, body);
    throw new SchoologyApiError("Schoology resource was not found.", 404);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logSchoologyApiError(method, requestUrl, response.status, body);
    throw new SchoologyApiError(
      `Schoology API request failed (${response.status}). ${body}`.trim(),
      response.status,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SchoologyApiError(
      "Schoology API returned an unexpected response format.",
      response.status,
    );
  }
}

export async function schoologyApiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const config = requireClientConfig();
  const url = buildSchoologyApiUrl(path, options.query);
  const authorization = buildAuthorization("GET", url, config.consumerKey, config.consumerSecret);
  logSchoologyApiRequest("GET", url, authorization);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
    },
    redirect: "manual",
    cache: "no-store",
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) {
      const redirectUrl = new URL(location, url).toString();
      const redirectAuth = buildAuthorization(
        "GET",
        redirectUrl,
        config.consumerKey,
        config.consumerSecret,
      );
      logSchoologyApiRequest("GET", redirectUrl, redirectAuth);
      const redirectResponse = await fetch(redirectUrl, {
        method: "GET",
        headers: {
          Authorization: redirectAuth,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      return parseApiResponse<T>(redirectResponse, "GET", redirectUrl);
    }
  }

  return parseApiResponse<T>(response, "GET", url);
}

/** GET that returns null on 403/404 (optional enrichment — e.g. rubrics the key cannot list). */
export async function schoologyApiGetOptional<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  try {
    return await schoologyApiGet<T>(path, options);
  } catch (err) {
    if (err instanceof SchoologyApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    if (err instanceof SchoologyAuthError) {
      return null;
    }
    throw err;
  }
}

export async function schoologyApiFetchAbsolute(
  absoluteUrl: string,
  options: { method?: "GET" | "POST" } = {},
): Promise<Response> {
  const config = requireClientConfig();
  const method = options.method ?? "GET";
  const authorization = buildAuthorization(
    method,
    absoluteUrl,
    config.consumerKey,
    config.consumerSecret,
  );
  logSchoologyApiRequest(method, absoluteUrl, authorization);

  const response = await fetch(absoluteUrl, {
    method,
    headers: { Authorization: authorization },
    redirect: "manual",
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    const body = await response.text().catch(() => "");
    logSchoologyApiError(method, absoluteUrl, response.status, body);
    throw new SchoologyAuthError(buildAuthFailureMessage(response.status, body));
  }

  return response;
}

export function normalizeApiArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Resolve the authenticated user via /app-user-info → /users/{uid}. */
export async function fetchCurrentUser(): Promise<{ id: string; name?: string }> {
  const session = await getSchoologyCurrentUser();

  if (!session.connected) {
    if (session.code === "missing_credentials") {
      throw new SchoologyConfigError(session.error);
    }
    throw new SchoologyAuthError(session.error);
  }

  const user = session.user;
  const id = user.uid ?? user.id;
  if (id == null) {
    throw new SchoologyApiError("Could not determine the authenticated Schoology user.", 500);
  }

  const name =
    user.name_display?.trim() ||
    user.name?.trim() ||
    undefined;

  const pictureUrl =
    user.picture_url?.trim() ||
    user.profile_url?.trim() ||
    undefined;

  return {
    id: String(id),
    ...(name ? { name } : {}),
    ...(pictureUrl ? { pictureUrl } : {}),
  };
}

export type SchoologyApiProbeResult = {
  method: "GET";
  baseUrl: string;
  hostname: string;
  path: string;
  requestUrl: string;
  executed: boolean;
  ok?: boolean;
  status?: number;
  userId?: string;
  error?: string;
};

/** Probe Schoology auth — uses app-user-info flow (not /users/me). */
export async function probeSchoologyApiEndpoint(
  apiPath = "/app-user-info",
): Promise<SchoologyApiProbeResult> {
  const baseUrl = getSchoologyApiBase();
  const requestUrl = buildSchoologyApiUrl(apiPath);
  const { hostname, path } = describeSchoologyApiRequest(requestUrl);

  const result: SchoologyApiProbeResult = {
    method: "GET",
    baseUrl,
    hostname,
    path,
    requestUrl,
    executed: false,
  };

  const configResult = getSchoologyConfig();
  if (!configResult.ok) {
    result.error = configResult.message;
    return result;
  }

  if (apiPath !== "/app-user-info" && apiPath !== "/users/me") {
    try {
      await schoologyApiGet(apiPath);
      result.executed = true;
      result.ok = true;
      result.status = 200;
      return result;
    } catch (err) {
      result.executed = true;
      result.ok = false;
      if (err instanceof SchoologyApiError) {
        result.status = err.status;
      } else if (err instanceof SchoologyAuthError) {
        result.status = 401;
      }
      result.error = err instanceof Error ? err.message : "Schoology API probe failed.";
      return result;
    }
  }

  try {
    const user = await fetchCurrentUser();
    result.executed = true;
    result.ok = true;
    result.status = 200;
    result.userId = user.id;
    return result;
  } catch (err) {
    result.executed = true;
    result.ok = false;
    if (err instanceof SchoologyApiError) {
      result.status = err.status;
    } else if (err instanceof SchoologyAuthError) {
      result.status = 401;
    }
    result.error = err instanceof Error ? err.message : "Schoology API probe failed.";
    return result;
  }
}
