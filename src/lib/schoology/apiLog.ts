/** Safe OAuth header introspection — never logs secrets. */
export function parseOAuthSignatureMethod(authorization?: string): string | undefined {
  if (!authorization?.trim()) {
    return undefined;
  }

  const quoted = authorization.match(/oauth_signature_method="([^"]*)"/i);
  if (quoted?.[1] != null) {
    return decodeURIComponent(quoted[1]);
  }

  const unquoted = authorization.match(/oauth_signature_method=([^,\s"]+)/i);
  if (unquoted?.[1] != null) {
    return decodeURIComponent(unquoted[1].replace(/^"|"$/g, ""));
  }

  return undefined;
}

function formatQueryParams(requestUrl: string): string {
  try {
    const params: Record<string, string> = {};
    new URL(requestUrl).searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return Object.keys(params).length > 0 ? JSON.stringify(params) : "(none)";
  } catch {
    return "(invalid url)";
  }
}

/**
 * Log outbound Schoology API request metadata before fetch.
 * Never logs consumer key/secret, oauth_signature, or the full Authorization header.
 */
export function logSchoologyApiRequest(
  method: string,
  requestUrl: string,
  authorization?: string,
): void {
  const hasAuthorization = Boolean(authorization?.trim());
  const oauthSignatureMethod =
    parseOAuthSignatureMethod(authorization) ?? (hasAuthorization ? "(unknown)" : "(none)");

  try {
    const parsed = new URL(requestUrl);
    console.info(
      `[Schoology API] ${method.toUpperCase()} ` +
        `hostname=${parsed.hostname} ` +
        `pathname=${parsed.pathname} ` +
        `query=${formatQueryParams(requestUrl)} ` +
        `authorization=${hasAuthorization ? "yes" : "no"} ` +
        `oauth_signature_method=${oauthSignatureMethod}`,
    );
  } catch {
    console.info(
      `[Schoology API] ${method.toUpperCase()} ` +
        `url=${requestUrl} ` +
        `authorization=${hasAuthorization ? "yes" : "no"} ` +
        `oauth_signature_method=${oauthSignatureMethod}`,
    );
  }
}

/** Log Schoology API failures without secrets (no Authorization header or env values). */
export function logSchoologyApiError(
  method: string,
  requestUrl: string,
  status: number,
  body: string,
): void {
  let pathname = requestUrl;
  let hostname: string | undefined;
  let query = "(unknown)";
  try {
    const parsed = new URL(requestUrl);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
    query = formatQueryParams(requestUrl);
  } catch {
    // keep raw path if URL parsing fails
  }

  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 500);
  const hostLabel = hostname ? ` hostname=${hostname}` : "";
  console.error(
    `[Schoology API] ${method.toUpperCase()}${hostLabel} pathname=${pathname} query=${query} → HTTP ${status}${
      snippet ? `: ${snippet}` : ""
    }`,
  );
}
