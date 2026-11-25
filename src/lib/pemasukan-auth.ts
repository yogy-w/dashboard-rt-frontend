type SessionUser = { username: string; role: string; exp: number };
const COOKIE_NAME = 'rt_pemasukan_session';
const SESSION_SECONDS = 8 * 60 * 60;
function toBase64Url(bytes: Uint8Array) {
  let binary = ''; bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(base64); return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}
export async function createSessionToken(username: string, role: string, secret: string) {
  const payload: SessionUser = { username, role, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded, secret)}`;
}
export async function getSession(token: string | undefined, secret: string | undefined): Promise<SessionUser | null> {
  if (!token || !secret) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  const expected = await sign(encoded, secret);
  if (expected.length !== signature.length) return null;
  let mismatch = 0; for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (mismatch !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionUser;
    if (!payload.username || !payload.role || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
export async function isValidSession(token: string | undefined, secret: string | undefined) { return Boolean(await getSession(token, secret)); }
export const sessionCookieName = COOKIE_NAME;
export const sessionMaxAge = SESSION_SECONDS;
