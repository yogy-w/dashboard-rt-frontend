const COOKIE_NAME = 'rt_pemasukan_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(secret: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await sign(`pemasukan:${expires}`, secret);
  return `${expires}.${signature}`;
}

export async function isValidSession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false;
  const [expText, signature] = token.split('.');
  const exp = Number(expText);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = await sign(`pemasukan:${exp}`, secret);
  if (expected.length !== signature.length) return false;
  // Constant-time-ish comparison to avoid ordinary early-exit string comparison.
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

export const sessionCookieName = COOKIE_NAME;
export const sessionMaxAge = SESSION_SECONDS;
