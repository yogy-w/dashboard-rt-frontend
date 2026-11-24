import { NextRequest, NextResponse } from "next/server";
import { isValidSession, sessionCookieName } from "../../../../lib/pemasukan-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const valid = await isValidSession(
    request.cookies.get(sessionCookieName)?.value,
    process.env.PEMASUKAN_SESSION_SECRET
  );
  return NextResponse.json({ authenticated: valid }, { headers: { "Cache-Control": "no-store" } });
}
