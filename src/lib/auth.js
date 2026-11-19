// Ortak yardımcılar: giriş bilgileri, oturum (imzalı çerez) ve JSON cevabı.
// Giriş bilgisi önce KV'deki "cred" kaydından (panelden değiştirilmişse), yoksa ADMIN_USER / ADMIN_PASS gizli ayarlarından okunur.
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

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

export async function hashPass(pass, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' }, key, 256));
}

export async function newCred(u, p) {
  const s = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { u, s, h: await hashPass(p, s), v: Date.now() };
}

// Geçerli giriş bilgisi: { u, kind: 'kv'|'env', c? } ya da null
export async function creds(env) {
  try {
    const t = env.MENU_KV && (await env.MENU_KV.get('cred'));
    if (t) {
      const c = JSON.parse(t);
      if (c && c.u && c.s && c.h) return { u: c.u, kind: 'kv', c };
    }
  } catch {}
  if (env.ADMIN_USER && env.ADMIN_PASS) return { u: env.ADMIN_USER, kind: 'env' };
  return null;
}

export async function checkLogin(env, st, u, p) {
  const okU = await safeEqual(u, st.u);
  const okP = st.kind === 'kv' ? await safeEqual(await hashPass(p, st.c.s), st.c.h) : await safeEqual(p, env.ADMIN_PASS);
  return okU && okP;
}

const secretFor = (env, st) =>
  (env.SESSION_SECRET || '') + '|' + (st.kind === 'kv' ? st.c.v + '|' + st.c.h : st.u + '|' + env.ADMIN_PASS);

export async function makeToken(env, st, ttl = 12 * 3600) {
  const payload = b64u(enc.encode(JSON.stringify({ u: st.u, exp: Math.floor(Date.now() / 1000) + ttl })));
  return payload + '.' + b64u(await hmac(secretFor(env, st), payload));
}

export function cookie(request, value, maxAge) {
  const https = new URL(request.url).protocol === 'https:';
  return `adm=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}` + (https ? '; Secure' : '');
}

export async function isAdmin(request, env) {
  const st = await creds(env);
  if (!st) return false;
  const m = /(?:^|;\s*)adm=([^;]+)/.exec(request.headers.get('Cookie') || '');
  if (!m) return false;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return false;
  if (!(await safeEqual(sig, b64u(await hmac(secretFor(env, st), payload))))) return false;
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return data.u === st.u && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

// Hatalı deneme sınırı (IP başına 15 dakikada 8)
export const rlKey = (request) => 'rl:' + (request.headers.get('CF-Connecting-IP') || 'x');
