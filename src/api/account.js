// Giriş yapmış yönetici: kullanıcı adını ve/veya şifreyi değiştirir.
import { json, isAdmin, creds, checkLogin, newCred, makeToken, cookie, rlKey } from '../lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.MENU_KV) return json({ error: 'KV bağlantısı (MENU_KV) yapılmamış.' }, 500);
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz. Tekrar giriş yap.' }, 401);
  const st = await creds(env);
  if (!st) return json({ error: 'Giriş bilgisi bulunamadı.' }, 500);

  const key = rlKey(request);
  const tries = Number(await env.MENU_KV.get(key)) || 0;
  if (tries >= 8) return json({ error: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.' }, 429);

  let b;
  try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek.' }, 400); }
  const cur = String((b && b.cp) || '');
  if (!(await checkLogin(env, st, st.u, cur))) {
    await env.MENU_KV.put(key, String(tries + 1), { expirationTtl: 900 });
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'Mevcut şifre hatalı.' }, 401);
  }

  const nu = String((b && b.nu) || '').trim() || st.u;
  const np = String((b && b.np) || '');
  if (nu.length < 3 || nu.length > 40 || /\s/.test(nu)) return json({ error: 'Kullanıcı adı 3–40 karakter olmalı ve boşluk içermemeli.' }, 400);
  if (np && (np.length < 8 || np.length > 100)) return json({ error: 'Yeni şifre en az 8 karakter olmalı.' }, 400);
  if (nu === st.u && !np) return json({ error: 'Değiştirilecek bir şey girilmedi.' }, 400);

  const c = await newCred(nu, np || cur);
  await env.MENU_KV.put('cred', JSON.stringify(c));
  await env.MENU_KV.delete(key);
  // Eski oturumlar geçersiz olur; bu oturum yeni bilgiyle yenilenir.
  return json({ ok: true, u: nu }, 200, { 'Set-Cookie': cookie(request, await makeToken(env, { u: nu, kind: 'kv', c }), 12 * 3600) });
}
