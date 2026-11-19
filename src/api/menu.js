// Herkese açık: kayıtlı menüyü verir. Kayıt yoksa D: null döner, sayfa public/menu.js'teki menüyü kullanır.
import { json } from '../lib/auth.js';

export async function onRequestGet({ env }) {
  let D = null;
  try {
    if (env.MENU_KV) {
      const t = await env.MENU_KV.get('menu');
      if (t) D = JSON.parse(t);
    }
  } catch {}
  return json({ D });
}
