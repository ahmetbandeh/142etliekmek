// Yalnızca giriş yapmış yönetici: menüyü kaydeder.
import { json, isAdmin } from '../lib/auth.js';

const str = (v, n) => String(v ?? '').slice(0, n);
const num = (v) => { v = Number(v); return Number.isFinite(v) && v >= 0 && v <= 1e6 ? Math.round(v * 100) / 100 : 0; };

function clean(D) {
  if (!Array.isArray(D) || D.length < 1 || D.length > 60) return null;
  const out = [];
  for (const s of D) {
    if (!Array.isArray(s) || !Array.isArray(s[3]) || s[3].length > 300) return null;
    out.push([
      str(s[0], 40), str(s[1], 80), str(s[2], 300),
      s[3].map((r) => {
        if (!Array.isArray(r)) r = [];
        const a = [str(r[0], 120), str(r[1], 400), num(r[2]), num(r[3]), str(r[4], 40), str(r[5], 40)];
        if (r[6] || r[7]) { a.push(r[6] ? 1 : 0); if (r[7]) a.push(1); }
        return a;
      }),
    ]);
  }
  return JSON.stringify(out).length > 200000 ? null : out;
}

export async function onRequestPost({ request, env }) {
  if (!env.MENU_KV) return json({ error: 'KV bağlantısı (MENU_KV) yapılmamış (README, Adım 3).' }, 500);
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz. Tekrar giriş yap.' }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Geçersiz veri.' }, 400); }
  const D = clean(b && b.D);
  if (!D) return json({ error: 'Menü verisi geçersiz ya da çok büyük.' }, 400);
  await env.MENU_KV.put('menu', JSON.stringify(D));
  return json({ ok: true });
}
