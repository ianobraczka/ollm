import { createHmac, randomBytes } from "crypto";

/** RFC 5849 percent-encoding (OAuth 1.0). */
export function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  const port =
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
      ? ""
      : parsed.port
        ? `:${parsed.port}`
        : "";
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${parsed.pathname}`;
}

function buildParameterString(
  oauthParams: Record<string, string>,
  queryParams: Record<string, string>,
): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries({ ...queryParams, ...oauthParams })) {
    pairs.push(`${percentEncode(key)}=${percentEncode(value)}`);
  }
  pairs.sort();
  return pairs.join("&");
}

function signHmacSha1(
  baseString: string,
  consumerSecret: string,
  tokenSecret = "",
): string {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

export type OAuth1SignOptions = {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  queryParams?: Record<string, string>;
  /** Schoology two-legged OAuth over HTTPS (default: true). */
  schoologyTwoLegged?: boolean;
};

/**
 * Build an OAuth 1.0 Authorization header.
 * For Schoology two-legged requests: realm, empty oauth_token, and PLAINTEXT signing.
 * @see https://developer.schoology.com/api-documentation/authentication/
 */
export function buildOAuth1AuthorizationHeader(options: OAuth1SignOptions): string {
  const {
    method,
    url,
    consumerKey,
    consumerSecret,
    token,
    tokenSecret = "",
    queryParams = {},
    schoologyTwoLegged = true,
  } = options;

  const oauthToken = token ?? (schoologyTwoLegged ? "" : undefined);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");

  const usePlaintext = schoologyTwoLegged && new URL(url).protocol === "https:";

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: usePlaintext ? "PLAINTEXT" : "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
  };

  if (oauthToken !== undefined) {
    oauthParams.oauth_token = oauthToken;
  }

  if (usePlaintext) {
    // PLAINTEXT: consumer_secret& (token secret empty) → secret + "%26" in header
    oauthParams.oauth_signature = `${consumerSecret}%26`;
  } else {
    const baseString = [
      method.toUpperCase(),
      percentEncode(normalizeUrl(url)),
      percentEncode(buildParameterString(oauthParams, queryParams)),
    ].join("&");
    oauthParams.oauth_signature = signHmacSha1(baseString, consumerSecret, tokenSecret);
  }

  const headerParts: string[] = [];

  if (schoologyTwoLegged) {
    headerParts.push('realm="Schoology API"');
  }

  headerParts.push(`oauth_consumer_key="${consumerKey}"`);

  if (oauthToken !== undefined) {
    headerParts.push(`oauth_token="${oauthToken}"`);
  }

  headerParts.push(`oauth_nonce="${nonce}"`);
  headerParts.push(`oauth_timestamp="${timestamp}"`);
  headerParts.push(`oauth_signature_method="${oauthParams.oauth_signature_method}"`);
  headerParts.push('oauth_version="1.0"');
  headerParts.push(`oauth_signature="${oauthParams.oauth_signature}"`);

  return `OAuth ${headerParts.join(",")}`;
}
