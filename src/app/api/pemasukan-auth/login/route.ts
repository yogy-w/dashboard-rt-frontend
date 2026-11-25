import { NextRequest, NextResponse } from 'next/server';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { createSessionToken, sessionCookieName, sessionMaxAge } from '../../../../lib/pemasukan-auth';
import { writeServerAudit } from '../../../../lib/server-audit';

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex, extra] = String(stored || '').split(':');
  if (!salt || !expectedHex || extra || !/^[a-f0-9]{32,128}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ success: false, message: 'Origin tidak diizinkan.' }, { status: 403 });
  const secret = process.env.PEMASUKAN_SESSION_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ success: false, message: 'PEMASUKAN_SESSION_SECRET belum diatur dengan aman.' }, { status: 500 });
  let body: { username?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: 'Permintaan tidak valid.' }, { status: 400 }); }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  let users: Array<{ username: string; passwordHash: string; role: string }> = [];
  try { users = JSON.parse(process.env.RT_USERS_JSON || '[]'); } catch { return NextResponse.json({ success: false, message: 'Konfigurasi RT_USERS_JSON tidak valid.' }, { status: 500 }); }
  const user = users.find(u => u.username === username && ['Ketua RT', 'Bendahara', 'Sekretaris'].includes(u.role));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ success: false, message: 'Username atau password salah.' }, { status: 401 });
  }
  const token = await createSessionToken(user.username, user.role, secret);
  await writeServerAudit({ username: user.username, role: user.role, activity: 'LOGIN_BERHASIL' });
  const response = NextResponse.json({ success: true, user: { username: user.username, role: user.role } });
  response.cookies.set(sessionCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionMaxAge });
  return response;
}
