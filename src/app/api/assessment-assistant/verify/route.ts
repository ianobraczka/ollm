import { NextResponse } from "next/server";

import { fetchCurrentUser, probeSchoologyApiEndpoint } from "@/lib/schoology/apiClient";
import { getSchoologyApiBase, SCHOOLOGY_API_HOST } from "@/lib/schoology/config";
import { isSchoologyDebugEnabled } from "@/lib/schoology/debugLog";
import { prefixSecret } from "@/lib/schoology/diagnostics";
import {
  SchoologyAuthError,
  SchoologyConfigError,
} from "@/lib/schoology/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isVerifyRouteAllowed(): boolean {
  return process.env.NODE_ENV === "development" || isSchoologyDebugEnabled();
}

/** Lightweight two-legged credential check — uses app-user-info flow. */
export async function GET() {
  if (!isVerifyRouteAllowed()) {
    return NextResponse.json(
      {
        error:
          "Schoology verify route is only available in development or when SCHOOLOGY_DEBUG=1.",
      },
      { status: 404 },
    );
  }

  try {
    const apiProbe = await probeSchoologyApiEndpoint("/app-user-info");

    if (!apiProbe.executed || !apiProbe.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: apiProbe.error ?? "Schoology API probe failed.",
          apiProbe,
        },
        { status: apiProbe.status === 401 ? 401 : 500 },
      );
    }

    const user = await fetchCurrentUser();

    return NextResponse.json({
      ok: true,
      message: "Two-legged Schoology API credentials are valid.",
      user,
      config: {
        apiBase: getSchoologyApiBase(),
        apiHost: SCHOOLOGY_API_HOST,
        consumerKeyPrefix: prefixSecret(process.env.SCHOOLOGY_CONSUMER_KEY ?? ""),
        authMode: "two-legged",
      },
      apiProbe,
    });
  } catch (err) {
    if (err instanceof SchoologyAuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }

    if (err instanceof SchoologyConfigError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }

    const message = err instanceof Error ? err.message : "Schoology verify failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
