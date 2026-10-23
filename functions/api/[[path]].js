// Cloudflare Pages Function: пересылает все запросы /api/* на сервер Render.
// Для браузера сайт и API живут на одном адресе — JS в public менять не нужно, куки работают.
// Переменные (Cloudflare → проект → Settings → Variables): BACKEND_URL, PROXY_KEY (секрет).
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('host');
  // Реальный IP посетителя знает только Cloudflare. Перезаписываем, чтобы подделать его было нельзя.
  headers.set('x-noventis-client-ip', request.headers.get('CF-Connecting-IP') || '');
  headers.set('x-noventis-proxy-key', String(env.PROXY_KEY || '').trim());

  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();

  try {
    const res = await fetch(env.BACKEND_URL.replace(/\/$/, '') + url.pathname + url.search, init);
    return new Response(res.body, res);
  } catch {
    return Response.json({ error: 'server_error' }, { status: 502 });
  }
}
