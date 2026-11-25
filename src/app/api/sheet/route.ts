import { NextRequest, NextResponse } from 'next/server';
// Endpoint khusus dashboard publik. URL tetap berada di server, tidak di bundle browser.
const PUBLIC_DASHBOARD_SCRIPT_URL = process.env.APPS_SCRIPT_PUBLIC_DASHBOARD_URL;
const PUBLIC_ACTIONS = new Set(['kas', 'jimpitan']);
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action') || 'kas';
    if (!PUBLIC_ACTIONS.has(action)) return NextResponse.json({ success: false, message: 'Action tidak valid.' }, { status: 400 });
    if (!PUBLIC_DASHBOARD_SCRIPT_URL) return NextResponse.json({ success: false, message: 'APPS_SCRIPT_PUBLIC_DASHBOARD_URL belum dikonfigurasi.' }, { status: 500 });
    const url = new URL(PUBLIC_DASHBOARD_SCRIPT_URL);
    url.searchParams.set('action', action);
    const response = await fetch(url.toString(), { cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ success: false, message: `Dashboard source error: ${response.status}` }, { status: 502 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Gagal mengambil data dashboard.' }, { status: 500 });
  }
}
