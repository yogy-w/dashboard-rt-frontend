import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookieName } from '../../../lib/pemasukan-auth';
const APPS_SCRIPT_RT_URL = process.env.APPS_SCRIPT_RT_URL;
const APPS_SCRIPT_RT_SECRET = process.env.APPS_SCRIPT_RT_SECRET;
function configurationError() {
  if (!APPS_SCRIPT_RT_URL || !APPS_SCRIPT_RT_SECRET || APPS_SCRIPT_RT_SECRET.length < 32) return NextResponse.json({ success: false, message: 'Konfigurasi Apps Script RT belum lengkap atau secret terlalu pendek.' }, { status: 500 });
  return null;
}
async function currentUser(request: NextRequest) {
  return getSession(request.cookies.get(sessionCookieName)?.value, process.env.PEMASUKAN_SESSION_SECRET);
}
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const configError = configurationError(); if (configError) return configError;
    const incoming = new URL(request.url); const params = new URLSearchParams();
    incoming.searchParams.forEach((value, key) => { if (!['key','secret','actor','username','role'].includes(key)) params.set(key, value); });
    params.set('key', APPS_SCRIPT_RT_SECRET!);
    const response = await fetch(`${APPS_SCRIPT_RT_URL}?${params.toString()}`, { cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: `Apps Script RT error: ${response.status}` }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal mengambil data RT' }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const configError = configurationError(); if (configError) return configError;
    const body = await request.json();
    const safeBody: Record<string, any> = { ...body, key: APPS_SCRIPT_RT_SECRET, actor: { username: user.username, role: user.role } };
    delete safeBody.secret; delete safeBody.username; delete safeBody.role;
    const response = await fetch(APPS_SCRIPT_RT_URL!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(safeBody), cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: `Apps Script RT error: ${response.status}` }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal menyimpan data RT' }, { status: 500 }); }
}
