// Yönetici girişi. Kullanıcı adı/şifre Cloudflare ortam değişkenlerinden (ADMIN_USER, ADMIN_PASS) okunur.
import { json, safeEqual, makeToken, cookie } from '../lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS)
    return json({ error: 'Sunucuda ADMIN_USER ve ADMIN_PASS tanımlı değil (README, Adım 3).' }, 500);
  if (!env.MENU_KV) return json({ error: 'KV bağlantısı (MENU_KV) yapılmamış (README, Adım 3).' }, 500);

  const key = 'rl:' + (request.headers.get('CF-Connecting-IP') || 'x');
  const tries = Number(await env.MENU_KV.get(key)) || 0;
  if (tries >= 8) return json({ error: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.' }, 429);

  let b;
  try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek.' }, 400); }
  const okU = await safeEqual(String((b && b.u) || '').trim(), env.ADMIN_USER);
  const okP = await safeEqual(String((b && b.p) || ''), env.ADMIN_PASS);
  if (!(okU && okP)) {
    await env.MENU_KV.put(key, String(tries + 1), { expirationTtl: 900 });
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
  }
  await env.MENU_KV.delete(key);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, await makeToken(env), 12 * 3600) });
}

export async function onRequestDelete({ request }) {
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
}
