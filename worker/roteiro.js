/* ==========================================================================
   worker/roteiro.js — Cloudflare Worker (opcional) para LINKS CURTOS.

   Sem ele, o roteiro inteiro vai dentro do link (#r=..., 1 a 3 mil caracteres).
   Com ele, o site guarda o roteiro já compactado aqui e o link fica com um
   código curto:  https://usuario.github.io/repo/#s=k7Qm2xPaB4

   Uso pelo site:
     POST /            corpo = roteiro codificado ("1z..." ou "1j...")  → { "id": "k7Qm2xPaB4" }
     GET  /?id=<id>                                                     → { "codigo": "1z..." }

   EDIÇÃO EM CONJUNTO (link #e=<doc>): um roteiro que várias pessoas editam.
     POST /doc                corpo = { "dados": {...} }                → { "id", "v": 1 }
     GET  /doc?id=<doc>                                                 → { "v", "dados", "t" }
     GET  /doc?id=<doc>&v=<n>  (já tenho a versão n)                    → { "v": n, "igual": true } se nada mudou
     PUT  /doc?id=<doc>&base=<n>  corpo = { "dados": {...} }
                               → { "v": n+1 }  ou  409 { "v", "dados" } se alguém salvou antes (o site mescla e tenta de novo)

   O código é derivado do conteúdo (SHA-256): o mesmo roteiro gera sempre o
   mesmo link e não ocupa espaço duas vezes.

   Configuração (painel da Cloudflare → Workers → Settings):
     Bindings → KV namespace   nome da variável: ROTEIROS
     Variables:
       ALLOWED_ORIGINS  (Text)  domínios que podem usar o Worker, separados por vírgula
                                ex.: https://seu-usuario.github.io,http://localhost:8000
       TTL_DIAS         (Text, opcional)  apaga os links curtos depois de N dias sem uso (vazio = nunca);
                                          os roteiros de edição em conjunto não expiram

   O passo a passo está no README ("Links curtos").
   ========================================================================== */

const MAX_BYTES = 64 * 1024;                      // um roteiro compactado tem poucos KB
const CODIGO = /^\d{1,3}[zj][A-Za-z0-9_-]{4,}$/;  // mesmo formato do link longo (js/compartilhar.js)
const ID = /^[A-Za-z0-9_-]{10}$/;
const DOC = /^[A-Za-z0-9_-]{12}$/;
const MAX_DOC = 256 * 1024;                       // roteiro completo (JSON) de edição em conjunto

function origens(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
}

function cors(request, env) {
  const origem = request.headers.get('Origin') || '';
  const h = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
  if (origem && origens(env).indexOf(origem) >= 0) h['Access-Control-Allow-Origin'] = origem;
  return h;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers) });
}

// 10 caracteres base64url do SHA-256 do roteiro (60 bits: colisão desprezível).
async function idDe(codigo) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codigo)));
  let bin = '';
  for (let i = 0; i < 8; i++) bin += String.fromCharCode(h[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 10);
}

// 12 caracteres aleatórios (72 bits): o link de edição não pode ser adivinhado.
function novoDocId() {
  const b = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function lerDados(request) {
  const tam = +(request.headers.get('Content-Length') || 0);
  if (tam > MAX_DOC) return null;
  const txt = await request.text();
  if (txt.length > MAX_DOC) return null;
  try { const j = JSON.parse(txt); return j && typeof j.dados === 'object' && j.dados && !Array.isArray(j.dados) ? j.dados : null; } catch (e) { return null; }
}

// Roteiros de edição em conjunto ("doc:<id>" no KV).
async function doc(request, env, h) {
  const q = new URL(request.url).searchParams, id = q.get('id') || '';
  if (request.method === 'POST') {
    const dados = await lerDados(request);
    if (!dados) return json({ erro: 'Roteiro inválido ou grande demais.' }, 400, h);
    const nid = novoDocId(), reg = { v: 1, dados, t: Date.now() };
    await env.ROTEIROS.put('doc:' + nid, JSON.stringify(reg));
    return json({ id: nid, v: 1 }, 200, h);
  }
  if (!DOC.test(id)) return json({ erro: 'Use ?id=<código do roteiro>.' }, 400, h);
  const atual = await env.ROTEIROS.get('doc:' + id, { type: 'json' });
  if (!atual) return json({ erro: 'Roteiro de edição não encontrado.' }, 404, h);
  if (request.method === 'GET') {
    if (q.get('v') && +q.get('v') === atual.v) return json({ v: atual.v, igual: true }, 200, h);
    return json(atual, 200, h);
  }
  if (request.method === 'PUT') {
    const dados = await lerDados(request);
    if (!dados) return json({ erro: 'Roteiro inválido ou grande demais.' }, 400, h);
    if (+q.get('base') !== atual.v) return json({ erro: 'Alguém salvou antes.', v: atual.v, dados: atual.dados }, 409, h);
    const reg = { v: atual.v + 1, dados, t: Date.now() };
    await env.ROTEIROS.put('doc:' + id, JSON.stringify(reg));
    return json({ v: reg.v }, 200, h);
  }
  return json({ erro: 'Use GET, POST ou PUT.' }, 405, h);
}

export default {
  async fetch(request, env) {
    const h = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    // só responde para os domínios autorizados (o seu GitHub Pages)
    const origem = request.headers.get('Origin') || '';
    if (!origem || origens(env).indexOf(origem) < 0) return json({ erro: 'Origem não autorizada.' }, 403, h);
    if (!env.ROTEIROS) return json({ erro: 'Falta ligar o KV namespace ROTEIROS ao Worker.' }, 500, h);
    if (new URL(request.url).pathname.replace(/\/+$/, '') === '/doc') return doc(request, env, h);

    if (request.method === 'GET') {
      const id = new URL(request.url).searchParams.get('id') || '';
      if (!ID.test(id)) return json({ erro: 'Use ?id=<código do link>.' }, 400, h);
      const codigo = await env.ROTEIROS.get(id);
      if (!codigo) return json({ erro: 'Link não encontrado (pode ter expirado ou sido apagado).' }, 404, h);
      return json({ codigo }, 200, Object.assign({ 'Cache-Control': 'public, max-age=300' }, h));
    }

    if (request.method === 'POST') {
      const tam = +(request.headers.get('Content-Length') || 0);
      if (tam > MAX_BYTES) return json({ erro: 'Roteiro grande demais.' }, 413, h);
      const codigo = (await request.text()).trim();
      if (codigo.length > MAX_BYTES) return json({ erro: 'Roteiro grande demais.' }, 413, h);
      if (!CODIGO.test(codigo)) return json({ erro: 'Conteúdo inválido: envie o roteiro codificado pelo site.' }, 400, h);
      const id = await idDe(codigo);
      const dias = parseInt(env.TTL_DIAS, 10);
      // mesmo roteiro já guardado: só grava de novo se houver prazo (para renovar a validade)
      if (dias > 0) await env.ROTEIROS.put(id, codigo, { expirationTtl: dias * 86400 });
      else if ((await env.ROTEIROS.get(id)) !== codigo) await env.ROTEIROS.put(id, codigo);
      return json({ id }, 200, h);
    }

    return json({ erro: 'Use GET ou POST.' }, 405, h);
  }
};
