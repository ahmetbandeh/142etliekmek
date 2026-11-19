// Ortak yardımcılar: oturum (imzalı çerez) ve JSON cevabı.
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const secretOf = (env) => (env.SESSION_SECRET || '') + '|' + env.ADMIN_USER + '|' + env.ADMIN_PASS;

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([hmac('cmp', String(a)), hmac('cmp', String(b))]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export async function makeToken(env, ttl = 12 * 3600) {
  const payload = b64u(enc.encode(JSON.stringify({ u: env.ADMIN_USER, exp: Math.floor(Date.now() / 1000) + ttl })));
  return payload + '.' + b64u(await hmac(secretOf(env), payload));
}

export function cookie(request, value, maxAge) {
  const https = new URL(request.url).protocol === 'https:';
  return `adm=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}` + (https ? '; Secure' : '');
}

export async function isAdmin(request, env) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return false;
  const m = /(?:^|;\s*)adm=([^;]+)/.exec(request.headers.get('Cookie') || '');
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return false;
  if (!(await safeEqual(sig, b64u(await hmac(secretOf(env), payload))))) return false;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return data.u === env.ADMIN_USER && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
