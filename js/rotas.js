/* ==========================================================================
   rotas.js — destinos diretos de cada aeroporto de saída (item "Saindo de").

   Fonte: a tabela "Airlines and destinations" da página do aeroporto na
   Wikipedia (em inglês), só a parte de passageiros. Os destinos são cruzados
   com as cidades do app (DATA.cities, pelo título "wiki" de cada uma).

   Duas camadas:
     1. DATA.rotas (js/data-rotas.js): cópia que vai junto com o site, gerada
        por scripts/rotas.mjs (`npm run rotas`). O site abre já com rotas.
     2. Atualização em segundo plano: ao escolher o aeroporto, o app busca só
        a página dele na Wikipedia e guarda o resultado no navegador por 30 dias.
        Se falhar (sem internet, página mudou de formato), fica a cópia do site
        e só tenta de novo no dia seguinte.

   Rotas.extrair(wikitext) é usada pelo site e pelo script (mesmo leitor).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const Rotas = window.Rotas = {};
  const DIA = 24 * 3600 * 1000, TTL = 30 * DIA;
  const API = 'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&origin=*&page=';

  /* -------------------------------------------------------------- leitor */
  // "São Paulo" → "sao paulo" (sem acento, minúsculas, sem pontuação)
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/_/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Nome da cidade como a Wikipedia escreve no destino → id da cidade do app.
  // Vem do título "wiki" de cada cidade ("Split, Croatia" → "split", "Luxembourg City" → "luxembourg"),
  // mais alguns apelidos usados nas tabelas de aeroportos.
  const APELIDOS = { malta: 'valletta', thira: 'santorini', 'santorini thira': 'santorini' };
  let indice = null;
  function cidadePorNome() {
    if (indice) return indice;
    indice = {};
    D.cities.forEach(c => {
      const w = norm(String(c.wiki || '').split(',')[0]).replace(/ city$/, '');
      if (w) indice[w] = c.id;
    });
    Object.keys(APELIDOS).forEach(k => { const id = APELIDOS[k]; if (D.cities.some(c => c.id === id)) indice[k] = id; });
    return indice;
  }

  // "[[Lisbon Airport|Lisbon]]" → "lisbon"; "[[Paris–Charles de Gaulle Airport|Paris–Charles de Gaulle]]" → "paris"
  function nomeDoDestino(alvo, rotulo) {
    let n = rotulo || alvo;
    n = n.split(/\s*[–—/]\s*|\s+-\s+/)[0];
    n = n.replace(/\s+(International\s+)?Airport$/i, '');
    return norm(n);
  }

  // Só a parte "Airlines and destinations" → "Passenger" (sem carga), sem referências nem comentários.
  function secaoPassageiros(wikitext) {
    const t = String(wikitext || '');
    const ini = t.search(/^==\s*Airlines and destinations\s*==\s*$/m);
    if (ini < 0) return null;
    let resto = t.slice(ini).replace(/^.*\n/, '');
    const fim = resto.search(/^==[^=]/m);
    if (fim >= 0) resto = resto.slice(0, fim);
    const p = resto.search(/^===+\s*Passengers?\s*===+\s*$/m);
    if (p >= 0) {
      resto = resto.slice(p).replace(/^.*\n/, '');
      const prox = resto.search(/^===?[^=]/m);
      if (prox >= 0) resto = resto.slice(0, prox);
    }
    return resto
      .replace(/<!--[\s\S]*?-->/g, '\n')
      .replace(/<ref[^>]*\/>/gi, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\{\{\s*(?:nowrap|nobr|no ?wrap)\s*\|([^{}]*)\}\}/gi, '$1');   // {{nowrap|[[Swiss International Air Lines]]}}
  }

  // wikitext da página do aeroporto → { cidadeId: { cias: [...], sazonal: true|false } }
  // Lança erro se não achar a tabela (o script avisa; o site fica com a cópia que já tem).
  Rotas.extrair = function (wikitext) {
    const sec = secaoPassageiros(wikitext);
    if (sec == null) throw new Error('tabela "Airlines and destinations" não encontrada');
    const idx = cidadePorNome(), out = {}, LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let linhas = 0, pendente = '';
    const registrar = (cia, destinos) => {
      linhas++;
      // marcadores: '''Seasonal:''' · '''Charter:''' · '''Seasonal charter:''' (fretamentos ficam de fora)
      const partes = destinos.split(/'{2,3}\s*(seasonal charter|charter|seasonal)\s*:?\s*'{2,3}\s*:?/i);
      let tipo = 'regular';
      partes.forEach((txt, i) => {
        if (i % 2 === 1) { tipo = /charter/i.test(txt) ? 'charter' : 'sazonal'; return; }
        if (tipo === 'charter') return;
        let m;
        LINK.lastIndex = 0;
        while ((m = LINK.exec(txt))) {
          const id = idx[nomeDoDestino(m[1], m[2])];
          if (!id) continue;
          const r = out[id] || (out[id] = { cias: [], sazonal: true, _regular: false });
          if (cia && r.cias.indexOf(cia) < 0) r.cias.push(cia);
          if (tipo === 'regular') r._regular = true;
        }
      });
    };
    sec.split('\n').forEach(l => {
      const s = l.trim();
      if (!s || s === '|-' || s.charAt(0) !== '|') { pendente = ''; return; }
      // "| [[Companhia]] | destinos"  ou  "| [[Companhia]] || destinos"  ou a companhia sozinha numa linha
      const m = /^\|\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(?:\|\|?\s*(.*))?$/.exec(s);
      if (m && m[3] !== undefined) { registrar((m[2] || m[1]).trim(), m[3]); pendente = ''; return; }
      if (m) { pendente = (m[2] || m[1]).trim(); return; }
      if (pendente) { registrar(pendente, s.replace(/^\|\|?/, '')); pendente = ''; }
    });
    if (!linhas) throw new Error('nenhuma companhia aérea na tabela');
    Object.keys(out).forEach(id => { out[id].sazonal = !out[id]._regular; delete out[id]._regular; out[id].cias.sort(); });
    return out;
  };

  /* -------------------------------------------- dados em uso (cópia ou cache) */
  const chave = iata => 'rotas:' + iata;
  const copia = iata => (D.rotas && D.rotas.aeroportos && D.rotas.aeroportos[iata]) || null;
  const Net = () => window.Net;

  // { destinos: { cidadeId: {cias, sazonal} }, data: 'AAAA-MM-DD', fonte: 'site' | 'wikipedia' } ou null
  Rotas.de = function (iata) {
    const c = Net() && Net().cacheGet(chave(iata));
    const site = copia(iata), dataSite = (D.rotas && D.rotas.atualizado) || '';
    if (c && c.v && c.v.destinos && (!site || (c.v.data || '') >= dataSite)) return { destinos: c.v.destinos, data: c.v.data, fonte: 'wikipedia' };
    return site ? { destinos: site, data: dataSite, fonte: 'site' } : null;
  };

  // Destino direto? → { cias, sazonal } ou null
  Rotas.direto = function (iata, cidadeId) {
    const r = Rotas.de(iata);
    return (r && r.destinos[cidadeId]) || null;
  };

  /* ---------------------------------------------- atualização em segundo plano */
  const emAndamento = {};
  // Busca as rotas do aeroporto na Wikipedia, se o que está guardado tem mais de 30 dias.
  // Resolve true se trouxe algo diferente (a tela deve ser redesenhada); nunca rejeita.
  Rotas.atualizar = function (iata) {
    const ap = (D.aeroportos || []).find(a => a.iata === iata), N = Net();
    if (!ap || !ap.wikiRotas || !N || typeof fetch === 'undefined' || !N.online()) return Promise.resolve(false);
    const c = N.cacheGet(chave(iata)), falha = N.cacheGet(chave(iata) + ':falha');
    if (c && Date.now() - c.t < TTL) return Promise.resolve(false);
    if (falha && Date.now() - falha.t < DIA) return Promise.resolve(false);
    if (emAndamento[iata]) return emAndamento[iata];
    const antes = JSON.stringify((Rotas.de(iata) || {}).destinos || null);
    const buscar = () => fetch(API + encodeURIComponent(ap.wikiRotas)).then(r => (r.ok ? r.json() : Promise.reject(new Error('Wikipedia ' + r.status))));
    emAndamento[iata] = N.enfileirar('wiki', buscar).then(j => {
      const destinos = Rotas.extrair(j && j.parse && j.parse.wikitext);
      if (!Object.keys(destinos).length) throw new Error('nenhum destino reconhecido');
      N.cacheSet(chave(iata), { destinos, data: new Date().toISOString().slice(0, 10) });
      N.cacheDel(chave(iata) + ':falha');
      return JSON.stringify(destinos) !== antes;
    }).catch(e => {
      if (window.console) console.warn('Rotas de ' + iata + ' na Wikipedia: ' + (e && e.message ? e.message : e));
      N.cacheSet(chave(iata) + ':falha', 1);
      return false;
    }).then(r => { delete emAndamento[iata]; return r; });
    return emAndamento[iata];
  };

  // Para os testes.
  Rotas._t = { norm, nomeDoDestino, secaoPassageiros, limpar: () => { indice = null; } };
})();
