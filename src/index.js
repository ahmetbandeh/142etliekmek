// Cloudflare Worker girişi: /api/* isteklerini karşılar, diğer her şeyi public/ klasöründen sunar.
import * as menu from './api/menu.js';
import * as login from './api/login.js';
import * as save from './api/save.js';
import * as account from './api/account.js';

const routes = { '/api/menu': menu, '/api/login': login, '/api/save': save, '/api/account': account };
const reply = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mod = routes[url.pathname];
    if (mod) {
      const name = 'onRequest' + request.method.charAt(0) + request.method.slice(1).toLowerCase();
      if (typeof mod[name] !== 'function') return reply({ error: 'Yöntem desteklenmiyor.' }, 405);
      try {
        return await mod[name]({ request, env, ctx });
      } catch (e) {
        return reply({ error: 'Sunucu hatası: ' + ((e && e.message) || 'bilinmiyor') }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return reply({ error: 'Bulunamadı.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
