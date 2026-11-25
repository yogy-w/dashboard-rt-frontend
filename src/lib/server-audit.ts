type AuditInput = { username: string; role: string; activity: string; module?: string };
export async function writeServerAudit(input: AuditInput) {
  const url = process.env.APPS_SCRIPT_RT_URL;
  const key = process.env.APPS_SCRIPT_RT_SECRET;
  if (!url || !key) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'audit_event', key, actor: { username: input.username, role: input.role }, module: input.module || 'SISTEM', activity: input.activity }), cache: 'no-store', redirect: 'follow' });
  } catch (error) { console.error('Gagal menulis audit log:', error); }
}
