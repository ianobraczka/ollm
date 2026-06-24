import { NextResponse } from "next/server";

import { getSchoologyConfig, getSchoologyCurrentUser } from "@/lib/schoology/apiClient";

export const runtime = "nodejs";

function publicUserProfile(user: {
  id?: string;
  uid?: string;
  name?: string;
  name_display?: string;
  username?: string;
  primary_email?: string;
  role_id?: string;
  school_id?: string;
}) {
  return {
    id: user.id ?? user.uid ?? null,
    name: user.name_display ?? user.name ?? null,
    username: user.username ?? null,
    email: user.primary_email ?? null,
    roleId: user.role_id ?? null,
    schoolId: user.school_id ?? null,
  };
}

export async function GET() {
  const configResult = getSchoologyConfig();
  if (!configResult.ok) {
    return NextResponse.json({
      connected: false,
      error: configResult.message,
      missing: configResult.missing,
    });
  }

  const session = await getSchoologyCurrentUser();

  if (!session.connected) {
    return NextResponse.json({
      connected: false,
      error: session.error,
      status: session.status || undefined,
      code: session.code,
    });
  }

  return NextResponse.json({
    connected: true,
    user: publicUserProfile(session.user),
    status: session.status,
  });
}
