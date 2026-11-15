/* ==========================================================================
   worker/futebol.js — Cloudflare Worker (opcional) para os jogos automáticos.

   O site é estático e não pode guardar segredos. Este Worker guarda a chave da
   football-data.org e só repassa UMA consulta: os jogos de um time em um
   intervalo de datas. O site chama o Worker; o Worker chama a API com a chave.

   Uso pelo site:
     GET https://<seu-worker>.workers.dev/?team=57&dateFrom=2027-03-01&dateTo=2027-03-10

   Configuração (painel da Cloudflare → Workers → Settings → Variables):
     FOOTBALL_DATA_KEY  (Secret)  sua chave grátis de https://www.football-data.org/client/register
     ALLOWED_ORIGINS    (Text)    domínios que podem usar o Worker, separados por vírgula
                                  ex.: https://seu-usuario.github.io,http://localhost:8765

   O passo a passo está no README ("Jogos automáticos").
   ========================================================================== */

const API = 'https://api.football-data.org/v4';
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_S = 6 * 3600;      // guarda cada resposta por 6 h (o plano grátis permite 10 consultas por minuto)
const MAX_DIAS = 45;           // intervalo máximo de datas por consulta

function origens(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
}

function cors(request, env) {
  const origem = request.headers.get('Origin') || '';
  const h = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' };
  if (origem && origens(env).indexOf(origem) >= 0) h['Access-Control-Allow-Origin'] = origem;
  return h;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers) });
}

export default {
  async fetch(request, env, ctx) {
    const h = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (request.method !== 'GET') return json({ erro: 'Só GET.' }, 405, h);

    // só responde para os domínios autorizados (o seu GitHub Pages)
    const origem = request.headers.get('Origin') || '';
    if (!origem || origens(env).indexOf(origem) < 0) return json({ erro: 'Origem não autorizada.' }, 403, h);
    if (!env.FOOTBALL_DATA_KEY) return json({ erro: 'Falta configurar FOOTBALL_DATA_KEY no Worker.' }, 500, h);

    // só repassa uma consulta bem definida: time (número) + intervalo de datas
    const q = new URL(request.url).searchParams;
    const team = q.get('team') || '', de = q.get('dateFrom') || '', ate = q.get('dateTo') || '';
    if (!/^\d{1,6}$/.test(team) || !DATA.test(de) || !DATA.test(ate)) return json({ erro: 'Use ?team=<número>&dateFrom=AAAA-MM-DD&dateTo=AAAA-MM-DD' }, 400, h);
    const dias = (Date.parse(ate) - Date.parse(de)) / 86400000;
    if (!(dias >= 0 && dias <= MAX_DIAS)) return json({ erro: 'Intervalo de datas inválido (máximo de ' + MAX_DIAS + ' dias).' }, 400, h);

    const alvo = API + '/teams/' + team + '/matches?dateFrom=' + de + '&dateTo=' + ate;
    const cache = caches.default, chave = new Request(alvo);
    let resp = await cache.match(chave);
    if (!resp) {
      const r = await fetch(alvo, { headers: { 'X-Auth-Token': env.FOOTBALL_DATA_KEY } });
      if (!r.ok) return json({ erro: 'A football-data.org respondeu ' + r.status + '.' }, r.status === 429 ? 429 : 502, h);
      resp = new Response(await r.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_S } });
      ctx.waitUntil(cache.put(chave, resp.clone()));
    }
    const saida = new Response(resp.body, resp);
    Object.keys(h).forEach(k => saida.headers.set(k, h[k]));
    return saida;
  }
};
