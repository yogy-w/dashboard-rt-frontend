import { NextRequest, NextResponse } from 'next/server';
import { isValidSession, sessionCookieName } from './lib/pemasukan-auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/pemasukan/login';
  const isAuthApi = pathname.startsWith('/api/pemasukan-auth/');
  const isPemasukanPage = pathname === '/pemasukan' || pathname.startsWith('/pemasukan/');
  const isRtApi = pathname === '/api/rt' || pathname.startsWith('/api/rt/');

  if (!isPemasukanPage && !isRtApi) return NextResponse.next();
  if (isLoginPage || isAuthApi) return NextResponse.next();

  const valid = await isValidSession(
    request.cookies.get(sessionCookieName)?.value,
    process.env.PEMASUKAN_SESSION_SECRET
  );
  if (valid) return NextResponse.next();

  if (isRtApi) return NextResponse.json({ success: false, message: 'Silakan login untuk mengakses pemasukan.' }, { status: 401 });
  const loginUrl = new URL('/pemasukan/login', request.url);
  loginUrl.searchParams.set('next', '/pemasukan');
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/pemasukan/:path*', '/api/rt/:path*', '/api/rt'] };
