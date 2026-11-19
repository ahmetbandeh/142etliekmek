// Yönetici girişi.
import { json, creds, checkLogin, makeToken, cookie, rlKey } from '../lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.MENU_KV) return json({ error: 'KV bağlantısı (MENU_KV) yapılmamış (README, Adım 2).' }, 500);
  const st = await creds(env);
  if (!st) return json({ error: 'Sunucuda ADMIN_USER ve ADMIN_PASS tanımlı değil (README, Adım 3).' }, 500);

  const key = rlKey(request);
  const tries = Number(await env.MENU_KV.get(key)) || 0;
  if (tries >= 8) return json({ error: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.' }, 429);

  let b;
  try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek.' }, 400); }
  const ok = await checkLogin(env, st, String((b && b.u) || '').trim(), String((b && b.p) || ''));
  if (!ok) {
    await env.MENU_KV.put(key, String(tries + 1), { expirationTtl: 900 });
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'Kullanıcı adı veya şifre hatalı.' }, 401);
  }
  await env.MENU_KV.delete(key);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, await makeToken(env, st), 12 * 3600) });
}

export async function onRequestDelete({ request }) {
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
}
