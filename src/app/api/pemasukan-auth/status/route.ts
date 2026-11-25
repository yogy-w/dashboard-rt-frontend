import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieName } from '../../../../lib/pemasukan-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const user = await getSession(request.cookies.get(sessionCookieName)?.value, process.env.PEMASUKAN_SESSION_SECRET);
  return NextResponse.json({ authenticated: Boolean(user), user: user ? { username: user.username, role: user.role } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
