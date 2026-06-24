import { NextResponse } from "next/server";

import { probeSchoologyApiEndpoint } from "@/lib/schoology/apiClient";
import {
  isSchoologyDebugEnabled,
  schoologyDebugLog,
} from "@/lib/schoology/debugLog";
import {
  runSchoologyDiagnostics,
  writeDiagnosticReport,
} from "@/lib/schoology/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDebugRouteAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    isSchoologyDebugEnabled()
  );
}

export async function GET() {
  if (!isDebugRouteAllowed()) {
    return NextResponse.json(
      { error: "Schoology debug route is only available in development or when SCHOOLOGY_DEBUG=1." },
      { status: 404 },
    );
  }

  schoologyDebugLog("debug_route", { action: "run_diagnostics" });

  const apiProbe = await probeSchoologyApiEndpoint("/app-user-info");
  schoologyDebugLog("api_probe", {
    hostname: apiProbe.hostname,
    path: apiProbe.path,
    executed: apiProbe.executed,
    ok: apiProbe.ok,
    status: apiProbe.status,
  });

  const report = await runSchoologyDiagnostics();
  const reportPath = writeDiagnosticReport(report);

  return NextResponse.json({
    ...report,
    apiProbe,
    reportPath,
  });
}
