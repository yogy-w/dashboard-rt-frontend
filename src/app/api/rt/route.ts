import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_RT_URL = process.env.APPS_SCRIPT_RT_URL;
const APPS_SCRIPT_RT_SECRET = process.env.APPS_SCRIPT_RT_SECRET;

function configurationError() {
  if (!APPS_SCRIPT_RT_URL || !APPS_SCRIPT_RT_SECRET) {
    return NextResponse.json({ success: false, message: 'Konfigurasi Apps Script RT belum lengkap di environment server.' }, { status: 500 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const configError = configurationError(); if (configError) return configError;
    const incoming = new URL(request.url);
    const params = new URLSearchParams();
    incoming.searchParams.forEach((value, key) => { if (key !== 'key' && key !== 'secret') params.set(key, value); });
    // Apps Script web apps do not expose arbitrary request headers to doGet(e), so the shared secret is passed server-to-server only.
    params.set('key', APPS_SCRIPT_RT_SECRET!);
    const response = await fetch(`${APPS_SCRIPT_RT_URL}?${params.toString()}`, { cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: `Apps Script RT error: ${response.status}` }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal mengambil data RT' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const configError = configurationError(); if (configError) return configError;
    const body = await request.json();
    const response = await fetch(APPS_SCRIPT_RT_URL!, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, key: APPS_SCRIPT_RT_SECRET }), cache: 'no-store', redirect: 'follow',
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: `Apps Script RT error: ${response.status}` }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan pemasukan' }, { status: 500 });
  }
}
