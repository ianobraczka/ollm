import { NextResponse } from "next/server";

import { getSchoologyConfig, getSchoologyCurrentUser } from "@/lib/schoology/apiClient";
import { SchoologyAuthError, SchoologyConfigError } from "@/lib/schoology/errors";
import type { SchoologySessionStatus } from "@/types/schoology";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether two-legged API credentials can reach Schoology (app-user-info flow). */
export async function GET() {
  const configResult = getSchoologyConfig();
  if (!configResult.ok) {
    return NextResponse.json(
      { hasSession: false, error: configResult.message } satisfies SchoologySessionStatus & {
        error: string;
      },
      { status: 500 },
    );
  }

  try {
    const session = await getSchoologyCurrentUser();

    if (!session.connected) {
      const status = session.status === 401 || session.status === 403 ? 401 : 500;
      return NextResponse.json(
        { hasSession: false, error: session.error } satisfies SchoologySessionStatus & {
          error: string;
        },
        { status },
      );
    }

    const user = session.user;
    const id = user.uid ?? user.id;
    const name =
      user.name_display?.trim() ||
      user.name?.trim() ||
      undefined;

    const pictureUrl =
      user.picture_url?.trim() ||
      user.profile_url?.trim() ||
      undefined;

    const status: SchoologySessionStatus = {
      hasSession: true,
      savedAt: new Date().toISOString(),
      user: {
        id: String(id),
        ...(name ? { name } : {}),
        ...(pictureUrl ? { pictureUrl } : {}),
      },
    };

    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof SchoologyConfigError) {
      return NextResponse.json(
        { hasSession: false, error: err.message } satisfies SchoologySessionStatus & {
          error: string;
        },
        { status: 500 },
      );
    }

    if (err instanceof SchoologyAuthError) {
      return NextResponse.json(
        { hasSession: false, error: err.message } satisfies SchoologySessionStatus & {
          error: string;
        },
        { status: 401 },
      );
    }

    const message = err instanceof Error ? err.message : "Schoology API connection failed.";
    return NextResponse.json(
      { hasSession: false, error: message } satisfies SchoologySessionStatus & { error: string },
      { status: 500 },
    );
  }
}
