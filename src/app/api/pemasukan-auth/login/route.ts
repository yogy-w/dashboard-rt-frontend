
import { NextRequest, NextResponse } from 'next/server';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import {
  createSessionToken,
  sessionCookieName,
  sessionMaxAge,
} from '../../../../lib/pemasukan-auth';
import { writeServerAudit } from '../../../../lib/server-audit';

type RTUser = {
  username: string;
  passwordHash: string;
  role: string;
};

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex, extra] = String(stored || '').split(':');

  if (
    !salt ||
    !expectedHex ||
    extra ||
    !/^[a-f0-9]{32,128}$/i.test(salt) ||
    !/^[a-f0-9]{128}$/i.test(expectedHex)
  ) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');

  return (
    expected.length === actual.length &&
    timingSafeEqual(actual, expected)
  );
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { success: false, message: 'Origin tidak diizinkan.' },
      { status: 403 }
    );
  }

  const secret = process.env.PEMASUKAN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    return NextResponse.json(
      {
        success: false,
        message: 'PEMASUKAN_SESSION_SECRET belum diatur dengan aman.',
      },
      { status: 500 }
    );
  }

  let body: { username?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  let users: RTUser[];

  try {
    const rawUsers = process.env.RT_USERS_JSON;

    if (!rawUsers) {
      throw new Error('RT_USERS_JSON kosong atau belum diatur');
    }

    const parsed: unknown = JSON.parse(rawUsers);

    if (!Array.isArray(parsed)) {
      throw new Error('Format RT_USERS_JSON harus berupa array');
    }

    const validUsers = parsed.every(
      (user: unknown) =>
        typeof user === 'object' &&
        user !== null &&
        typeof (user as RTUser).username === 'string' &&
        typeof (user as RTUser).passwordHash === 'string' &&
        typeof (user as RTUser).role === 'string'
    );

    if (!validUsers) {
      throw new Error('Struktur data akun tidak sesuai');
    }

    users = parsed as RTUser[];

  } catch (error) {
    console.error(
      '[LOGIN CONFIG ERROR]',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Konfigurasi RT_USERS_JSON tidak valid.',
      },
      { status: 500 }
    );
  }

  const user = users.find(
    (u) =>
      u.username === username &&
      ['Ketua RT', 'Bendahara', 'Sekretaris'].includes(u.role)
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { success: false, message: 'Username atau password salah.' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(
    user.username,
    user.role,
    secret
  );

  await writeServerAudit({
    username: user.username,
    role: user.role,
    activity: 'LOGIN_BERHASIL',
  });

  const response = NextResponse.json({
    success: true,
    user: {
      username: user.username,
      role: user.role,
    },
  });

  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: sessionMaxAge,
  });

  return response;
}
