import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, sessionCookieName, sessionMaxAge } from '../../../../lib/pemasukan-auth';

export async function POST(request: NextRequest) {
  const username = process.env.PEMASUKAN_USERNAME;
  const password = process.env.PEMASUKAN_PASSWORD;
  const secret = process.env.PEMASUKAN_SESSION_SECRET;
  if (!username || !password || !secret) {
    return NextResponse.json({ success: false, message: 'Konfigurasi login belum lengkap di environment server.' }, { status: 500 });
  }
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Permintaan tidak valid.' }, { status: 400 }); }
  // Avoid leaking which credential was incorrect.
  if (body.username !== username || body.password !== password) {
    return NextResponse.json({ success: false, message: 'Username atau password salah.' }, { status: 401 });
  }
  const token = await createSessionToken(secret);
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: sessionMaxAge,
  });
  return response;
}
