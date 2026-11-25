import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieName } from '../../../../lib/pemasukan-auth';
import { writeServerAudit } from '../../../../lib/server-audit';
export async function POST(request: NextRequest) {
  const user = await getSession(request.cookies.get(sessionCookieName)?.value, process.env.PEMASUKAN_SESSION_SECRET);
  if (user) await writeServerAudit({ username: user.username, role: user.role, activity: 'LOGOUT' });
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
