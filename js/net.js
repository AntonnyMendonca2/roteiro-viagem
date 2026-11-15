/* ==========================================================================
   net.js — chamadas a APIs externas, com as regras da casa:

   - toda chamada passa por try/catch (aqui, Promises que nunca "explodem" sem tratamento);
   - a resposta fica guardada no localStorage com validade (TTL);
   - cada serviço tem uma fila com limite de requisições simultâneas e
     intervalo mínimo entre elas (servidores comunitários pedem educação);
   - sem internet, devolve o dado guardado (mesmo vencido) marcado como "stale".

   Uso:  Net.getJSON(url, { fila: 'wiki', ttl: Net.DIA * 30 }).then(r => r.data)
         r = { data, cache: true|false, stale: true|false, t: quando foi buscado }
   ========================================================================== */
(function () {
  'use strict';

  const Net = window.Net = {};
  const PREFIXO = 'viagem-cache:';
  Net.HORA = 3600 * 1000;
  Net.DIA = 24 * Net.HORA;

  /* ------------------------------------------------------------------ cache */
  // Guarda { t: quando, v: valor }. Se o localStorage não existir ou estiver cheio,
  // usa só a memória (o app continua funcionando).
  const mem = {};

  Net.cacheGet = function (chave) {
    if (mem[chave]) return mem[chave];
    try {
      const raw = window.localStorage.getItem(PREFIXO + chave);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (o && typeof o.t === 'number') { mem[chave] = o; return o; }
    } catch (e) { /* sem localStorage ou dado corrompido */ }
    return null;
  };

  // Apaga as entradas mais antigas do cache (quando o localStorage enche).
  function liberarEspaco(quantas) {
    try {
      const ls = window.localStorage, itens = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.indexOf(PREFIXO) === 0) {
          let t = 0;
          try { t = JSON.parse(ls.getItem(k)).t || 0; } catch (e) { /* remove mesmo assim */ }
          itens.push({ k, t });
        }
      }
      itens.sort((a, b) => a.t - b.t).slice(0, quantas).forEach(i => ls.removeItem(i.k));
      return itens.length > 0;
    } catch (e) { return false; }
  }

  Net.cacheSet = function (chave, valor) {
    const o = { t: Date.now(), v: valor };
    mem[chave] = o;
    const txt = JSON.stringify(o);
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try { window.localStorage.setItem(PREFIXO + chave, txt); return; }
      catch (e) { if (!liberarEspaco(12)) return; }
    }
  };

  Net.cacheDel = function (chave) {
    delete mem[chave];
    try { window.localStorage.removeItem(PREFIXO + chave); } catch (e) { /* ok */ }
  };

  /* ------------------------------------------------------------------ filas */
  // max = requisições simultâneas · gap = intervalo mínimo (ms) entre o início de duas requisições
  const FILAS = {
    padrao: { max: 4, gap: 0 },
    cambio: { max: 2, gap: 0 },       // Frankfurter
    clima: { max: 2, gap: 250 },      // Open-Meteo
    wiki: { max: 4, gap: 120 },       // Wikipedia / Wikimedia
    ape: { max: 1, gap: 1100 },       // OSRM a pé (servidor comunitário: 1 por segundo)
    trilhos: { max: 1, gap: 1100 },   // OpenRailRouting (servidor comunitário)
    horarios: { max: 1, gap: 600 },   // Transitous
    futebol: { max: 1, gap: 500 }     // proxy opcional (Cloudflare Worker)
  };
  const estado = {};

  function fila(nome) {
    if (!estado[nome]) estado[nome] = { cfg: FILAS[nome] || FILAS.padrao, ativos: 0, ultimo: 0, espera: [], timer: null };
    return estado[nome];
  }

  function bombear(f) {
    if (!f.espera.length || f.ativos >= f.cfg.max) return;
    const falta = f.ultimo + f.cfg.gap - Date.now();
    if (falta > 0) {
      if (!f.timer) f.timer = setTimeout(() => { f.timer = null; bombear(f); }, falta);
      return;
    }
    const job = f.espera.shift();
    f.ativos++; f.ultimo = Date.now();
    job().then(() => { f.ativos--; bombear(f); });
    bombear(f);
  }

  // Coloca uma tarefa (função que devolve Promise) na fila do serviço.
  Net.enfileirar = function (nome, fn) {
    const f = fila(nome);
    return new Promise((ok, falha) => {
      f.espera.push(() => {
        let p;
        try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
        return p.then(ok, falha);
      });
      bombear(f);
    });
  };

  /* ------------------------------------------------------------------ fetch */
  const andamento = {};   // requisições iguais em andamento compartilham a mesma Promise

  function buscar(url, timeout) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null;
    return fetch(url, ctl ? { signal: ctl.signal } : undefined)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(() => clearTimeout(timer));
  }

  /* opts: fila (nome), ttl (ms; 0 = sem cache), chave (padrão: a URL), timeout (ms),
           reduzir (fn que enxuga a resposta antes de guardar), semStale (não devolve cache vencido) */
  Net.getJSON = function (url, opts) {
    opts = opts || {};
    const chave = opts.chave || url, ttl = opts.ttl || 0;
    const c = ttl ? Net.cacheGet(chave) : null;
    if (c && Date.now() - c.t < ttl) return Promise.resolve({ data: c.v, cache: true, stale: false, t: c.t });
    if (andamento[chave]) return andamento[chave];

    const p = Net.enfileirar(opts.fila || 'padrao', () => buscar(url, opts.timeout || 15000))
      .then(json => {
        const v = opts.reduzir ? opts.reduzir(json) : json;
        if (ttl) Net.cacheSet(chave, v);
        return { data: v, cache: false, stale: false, t: Date.now() };
      })
      .catch(err => {
        // sem internet / erro do servidor: serve o que estiver guardado, mesmo vencido
        if (c && !opts.semStale) return { data: c.v, cache: true, stale: true, t: c.t };
        throw err;
      })
      .finally(() => { delete andamento[chave]; });
    andamento[chave] = p;
    return p;
  };

  // Só consulta o cache (não vai à rede). Devolve o valor ou null.
  Net.peek = function (chave, ttl) {
    const c = Net.cacheGet(chave);
    if (!c) return null;
    return (!ttl || Date.now() - c.t < ttl) ? c.v : null;
  };

  Net.online = () => (typeof navigator === 'undefined' || navigator.onLine !== false);
})();
