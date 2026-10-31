import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for uptime monitors.
 *
 * Deliberately touches no database and no session: it answers "is the server
 * process serving requests", and must stay cheap and free of user data. The
 * proxy skips this path so a monitor polling it never triggers an auth call.
 */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
