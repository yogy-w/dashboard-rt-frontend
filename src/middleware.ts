import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieName } from './lib/pemasukan-auth';
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/pemasukan/login';
  const isAuthApi = pathname.startsWith('/api/pemasukan-auth/');
  if (isAuthApi || isLoginPage) return NextResponse.next();
  const isInternalPage = pathname === '/pemasukan' || pathname.startsWith('/pemasukan/');
  const isInternalApi = pathname === '/api/rt' || pathname.startsWith('/api/rt/');
  if (!isInternalPage && !isInternalApi) return NextResponse.next();
  const user = await getSession(request.cookies.get(sessionCookieName)?.value, process.env.PEMASUKAN_SESSION_SECRET);
  if (user) return NextResponse.next();
  if (isInternalApi) return NextResponse.json({ success: false, message: 'Sesi berakhir. Silakan login kembali.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const loginUrl = new URL('/pemasukan/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
export const config = { matcher: ['/pemasukan/:path*', '/api/rt/:path*', '/api/rt'] };
