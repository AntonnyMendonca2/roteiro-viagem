/* ==========================================================================
   app.js — estado (localStorage), cálculos e inicialização.

   O estado do usuário (seleções, valores, câmbio...) fica em App.state e é
   salvo no localStorage. Tudo o que é derivado (rota, datas, totais) é
   recalculado em compute() e fica em App.calc.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const UI = window.UI;
  const MapView = window.MapView;
  const App = window.App = {};

  const LS_KEY = 'viagem-europa:v1';
  const DIAS_PLURAL = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  /* ------------------------------------------------------------ índices */
  const cityById = {}, poiById = {}, infoById = {};
  D.cities.forEach(c => { cityById[c.id] = c; });
  D.pois.forEach(p => { poiById[p.id] = p; });
  D.info.forEach(i => { infoById[i.id] = i; });

  App.city = id => cityById[id];
  App.poi = id => poiById[id];
  App.info = id => infoById[id];
  App.poisOf = cityId => D.pois.filter(p => p.cityId === cityId);

  /* ------------------------------------------------------------- utilidades */
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const num = x => { const n = parseFloat(x); return isFinite(n) ? n : 0; };
  const clone = x => JSON.parse(JSON.stringify(x));
  App.num = num;
  App.distKm = (a, b) => distKm(a, b);   // distância em linha reta (km) entre dois {lat, lon}

  // Datas sempre em UTC ao meio-dia, para não sofrer com fuso/horário de verão.
  App.parseDate = function (iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : new Date(NaN);
    return isNaN(d) ? App.parseDate(D.config.dataSaida) : d;
  };
  App.addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  App.iso = d => d.toISOString().slice(0, 10);

  App.isMobile = () => window.matchMedia('(max-width: 820px)').matches;

  // Área livre do mapa (fora do painel lateral, da barra superior e da linha do tempo).
  App.viewRect = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const sb = document.getElementById('sidebar').getBoundingClientRect();
    const tl = document.getElementById('timeline').getBoundingClientRect();
    if (App.isMobile()) {
      const aberto = document.body.classList.contains('drawer-open');
      const y1 = aberto ? h - Math.round(h * 0.62) : (tl.height ? tl.top : sb.top);
      return { x0: 0, y0: 92, x1: w, y1: Math.max(y1, 200) };
    }
    return { x0: 0, y0: 56, x1: sb.left, y1: tl.height ? tl.top : h };
  };

  /* ---------------------------------------------------------------- estado */
  function defaults() {
    const s = {
      v: 1,
      dataSaida: D.config.dataSaida,
      orcamento: D.config.orcamento,
      iof: !!D.config.iof,
      cambio: clone(D.cambio),
      cambioModo: 'auto',                       // 'auto' (Frankfurter/BCE) ou 'manual'
      spread: D.config.spreadPct,               // % acima da cotação comercial
      cambioInfo: { data: '', fonte: '', ant: null, antData: '' },   // data da cotação e cotações anteriores
      cities: {}, pois: {}, legs: {}, gerais: {},
      tag: null,
      otim: { auto: true, criterio: 'tempo', fixarPontas: true }   // rota inteligente
    };
    D.cities.forEach(c => {
      const custos = {};
      D.categorias.forEach(k => { custos[k.id] = { v: '', cur: 'BRL' }; });
      s.cities[c.id] = { sel: !!c.selecionada, noites: c.noites || 1, ordem: c.ordem || 99, custos,
        hosp: { nome: '', lat: null, lon: null } };   // minha hospedagem (marcada no mapa)
    });
    D.pois.forEach(p => {
      const ps = { sel: !!p.selecionado, valor: { v: p.preco.v, cur: p.preco.cur }, dia: '' };
      if (p.bateVolta) ps.transporte = clone(p.bateVolta.custo);
      s.pois[p.id] = ps;
    });
    D.gerais.forEach(g => { s.gerais[g.id] = { v: g.v, cur: g.cur }; });
    return s;
  }

  // Copia para "base" o que existir em "src" (mantém padrões de itens novos do data.js).
  function merge(base, src) {
    if (!isObj(src)) return base;
    Object.keys(src).forEach(k => {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      const b = base[k], v = src[k];
      if (isObj(b) && isObj(v)) merge(b, v);
      else if (v !== undefined && (b === undefined || b === null || isObj(b) === isObj(v))) base[k] = isObj(v) ? clone(v) : v;
    });
    return base;
  }

  function load() {
    const s = defaults();
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) merge(s, migrar(JSON.parse(raw)));
    } catch (e) { /* sem localStorage (ou dado corrompido): segue com o padrão */ }
    return sanitize(s);
  }

  // Ajusta dados salvos por versões antigas do app (antes de completar com os padrões).
  function migrar(src) {
    if (!isObj(src)) return src;
    // quem já tinha digitado o câmbio à mão continua no modo manual
    if (src.cambioModo === undefined && isObj(src.cambio) &&
        Object.keys(D.cambio).some(m => src.cambio[m] !== undefined && num(src.cambio[m]) !== D.cambio[m])) src.cambioModo = 'manual';
    return src;
  }

  function save() {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(App.state)); } catch (e) { /* app funciona sem salvar */ }
  }

  function sanitize(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.dataSaida || '')) s.dataSaida = D.config.dataSaida;
    D.cities.forEach(c => { s.cities[c.id].noites = Math.max(1, Math.min(60, Math.round(num(s.cities[c.id].noites)) || 1)); });
    if (s.tag && D.tags.indexOf(s.tag) < 0) s.tag = null;
    if (!App.CRITERIOS[s.otim.criterio]) s.otim.criterio = 'tempo';
    s.otim.auto = !!s.otim.auto; s.otim.fixarPontas = !!s.otim.fixarPontas;
    if (s.cambioModo !== 'manual') s.cambioModo = 'auto';
    s.spread = Math.max(0, Math.min(30, num(s.spread)));
    return s;
  }

  /* ----------------------------------------------------------------- câmbio */
  App.toBRL = function (v, cur) {
    v = num(v);
    if (!v || cur === 'BRL') return v;
    const taxa = num(App.state.cambio[cur]);
    // cotação comercial × spread (cartão/casa de câmbio) × IOF (se ligado)
    return v * taxa * window.Cambio.fator(App.state.spread, App.state.iof, D.config.iofPct);
  };

  /* -------------------------------------------------------------------- rota */
  App.route = function () {
    const S = App.state;
    return D.cities.filter(c => S.cities[c.id].sel)
      .sort((a, b) => S.cities[a.id].ordem - S.cities[b.id].ordem)
      .map(c => c.id);
  };

  function renumber(ids) { ids.forEach((id, i) => { App.state.cities[id].ordem = i + 1; }); }

  function distKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* ------------------------------------------------- meios de transporte */
  const MODOS = D.modos || ['trem', 'aviao'];                    // trem, ônibus, balsa, avião
  const TERRESTRES = D.modosTerrestres || ['trem'];
  App.MODOS = MODOS; App.TERRESTRES = TERRESTRES;
  const BALDEACAO_H = 0.5;   // tempo de troca em cada parada
  const MAX_TERRA_H = 30;    // acima disso o caminho por terra não é oferecido
  const midH = o => (o.h[0] + o.h[o.h.length - 1]) / 2;

  // índice dos trechos da tabela: "a~b" (ordenado) → trecho
  const legIdx = {};
  const parKey = (a, b) => (a < b ? a + '~' + b : b + '~' + a);
  D.legs.forEach(l => { legIdx[parKey(l.a, l.b)] = l; });
  // vizinhos de cada cidade na rede (para o Dijkstra)
  const vizinhos = {};
  D.legs.forEach(l => { (vizinhos[l.a] = vizinhos[l.a] || []).push(l); (vizinhos[l.b] = vizinhos[l.b] || []).push(l); });

  // Caminho mais rápido usando só os trechos da tabela e os modos permitidos (Dijkstra).
  // Ex.: Londres → Zurique de trem = Eurostar até Paris + TGV Lyria.
  const memoCaminho = {};
  function caminho(from, to, modos) {
    const chave = from + '>' + to + '|' + modos.join();
    if (chave in memoCaminho) return memoCaminho[chave];
    // melhor modo permitido de um trecho
    const melhor = l => {
      let m = null;
      modos.forEach(k => { if (l[k] && (!m || midH(l[k]) < midH(l[m]))) m = k; });
      return m;
    };
    const dist = {}, prev = {}, edge = {}, done = {};
    dist[from] = 0;
    for (;;) {
      let u = null;
      Object.keys(dist).forEach(id => { if (!done[id] && (u === null || dist[id] < dist[u])) u = id; });
      if (u === null || u === to) break;
      done[u] = true;
      (vizinhos[u] || []).forEach(l => {
        const m = melhor(l);
        if (!m) return;
        const v = l.a === u ? l.b : l.a, w = dist[u] + midH(l[m]) + BALDEACAO_H;
        if (dist[v] === undefined || w < dist[v]) { dist[v] = w; prev[v] = u; edge[v] = { l, m }; }
      });
    }
    let res = null;
    if (dist[to] !== undefined) {
      const ids = [to], es = [];
      for (let x = to; x !== from; x = prev[x]) { ids.unshift(prev[x]); es.unshift(edge[x]); }
      const vias = [];
      es.forEach((e, i) => {
        const o = e.l[e.m];
        if (o.via) vias.push(o.via);
        if (i < es.length - 1) vias.push({ cityId: ids[i + 1] });
      });
      const h = es.reduce((t, e) => t + midH(e.l[e.m]), 0) + BALDEACAO_H * Math.max(0, es.length - 1);
      const usados = [];
      es.forEach(e => { if (usados.indexOf(e.m) < 0) usados.push(e.m); });
      res = {
        desc: es.map(e => e.l[e.m].desc).join(' + '),
        h: [h, h],
        eur: [es.reduce((t, e) => t + e.l[e.m].eur[0], 0), es.reduce((t, e) => t + e.l[e.m].eur[1], 0)],
        vias, modos: usados, trechos: es.length
      };
    }
    memoCaminho[chave] = res;
    return res;
  }
  // Caminho só de trem (mantido com este nome para os testes e para a rede ferroviária).
  const trainPath = (from, to) => caminho(from, to, ['trem']);

  // Estimativa para pares que não estão na tabela de trechos: por terra, só pela rede
  // da tabela (trem puro e, se for bem mais rápido, a combinação com ônibus/balsa);
  // de avião, pela distância (+ o traslado de cidades sem aeroporto).
  const memoEst = {};
  function estimar(from, to) {
    const chave = from + '>' + to;
    if (memoEst[chave]) return memoEst[chave];
    const E = D.estimativa, a = cityById[from], b = cityById[to];
    const km = distKm(a, b);
    const def = { padrao: 'aviao', trem: null, onibus: null, balsa: null, aviao: null, aviso: '' };
    const trem = trainPath(from, to), misto = caminho(from, to, TERRESTRES);
    if (trem && trem.h[0] <= MAX_TERRA_H) def.trem = trem;
    if (misto && misto.h[0] <= MAX_TERRA_H && misto.modos.some(m => m !== 'trem') && (!def.trem || misto.h[0] < def.trem.h[0] * 0.85)) {
      def[misto.modos.indexOf('onibus') >= 0 ? 'onibus' : 'balsa'] = misto;
    }
    let terra = null;
    TERRESTRES.forEach(m => { if (def[m] && (!terra || def[m].h[0] < def[terra].h[0])) terra = m; });
    if (km >= 250 || !terra) {
      const extra = (a.aeroExtraH || 0) + (b.aeroExtraH || 0), h = km / E.aviaoKmh + extra;
      def.aviao = { desc: 'Voo (~' + Math.round(km) + ' km)' + (extra ? ' + traslado até o aeroporto' : ''), h: [h, h],
        eur: km > 1500 ? [70, 180] : E.aviaoEur.slice() };
    }
    def.padrao = terra && (def[terra].h[0] <= 9 || !def.aviao) ? terra : 'aviao';
    if (!terra) def.aviso = 'Sem ligação por terra viável neste trecho — somente avião.';
    memoEst[chave] = def;
    return def;
  }

  function viaInfo(via) {
    if (!via) return null;
    if (via.cityId) { const c = cityById[via.cityId]; return { cityId: c.id, nome: c.nome, lat: c.lat, lon: c.lon }; }
    return via;
  }

  // Definição de um trecho entre dois pontos da rota ('vcp' = Viracopos), sem tocar no estado.
  function legDef(from, to) {
    let key, def, intl = false, est = false;
    if (from === 'vcp' || to === 'vcp') {
      intl = true;
      const ida = from === 'vcp', cid = ida ? to : from;
      key = ida ? 'vcp>' + cid : cid + '>vcp';
      const listado = D.origem.voos[ida ? 'ida' : 'volta'][cid];
      const v = listado || D.origem.voos.generico;
      est = !listado;
      def = { padrao: 'aviao', trem: null, aviao: { desc: v.desc, h: v.h, eur: null, total: true } };
      // a linha da ida passa pela cidade de conexão (via: null no voo = direto)
      const via = v.via !== undefined ? v.via : D.origem.viaIda;
      if (ida && via && cid !== via) def.aviao.via = { cityId: via };
    } else {
      key = parKey(from, to);
      def = legIdx[key];
      if (!def) { est = true; def = estimar(from, to); }
    }
    return { key, def, intl, est };
  }

  // Monta um trecho da rota (definição + estado do usuário).
  function resolveLeg(from, to) {
    const { key, def, intl, est } = legDef(from, to);

    // estado do trecho (criado na primeira vez que o par aparece na rota)
    const S = App.state;
    if (!isObj(S.legs[key])) S.legs[key] = {};
    const st = S.legs[key];
    if (MODOS.indexOf(st.modo) < 0) st.modo = def.padrao;
    if (!isObj(st.real)) st.real = { v: '', cur: 'EUR' };
    if (typeof st.pernoite !== 'boolean') st.pernoite = true;   // pernoite é o recomendado
    if (!isObj(st.hospedagem)) st.hospedagem = clone(D.config.hospedagemPernoite);

    const leg = { key, from, to, intl, est, aviso: def.aviso || '', st, opts: {} };
    MODOS.forEach(m => {
      const o = def[m];
      if (!o) return;
      const extra = (m === 'aviao' && !o.total) ? D.estimativa.aviaoExtraH : 0;
      // "usar esta duração" (horários reais): substitui o tempo da tabela neste modo
      const hReal = st.horas && num(st.horas[m]) > 0 ? num(st.horas[m]) : null;
      leg.opts[m] = {
        desc: o.desc || '',
        h: hReal ? [hReal, hReal] : o.h,
        hReal: !!hReal,
        extra,
        horas: (hReal || (o.h[0] + o.h[o.h.length - 1]) / 2) + extra,     // porta a porta
        eur: o.eur || null,
        eurMid: o.eur ? (o.eur[0] + o.eur[1]) / 2 : 0,
        via: viaInfo(o.via),
        vias: (o.vias || (o.via ? [o.via] : [])).map(viaInfo),     // paradas no caminho (mapa)
        pernoite: !!o.pernoite,
        noturno: !!o.noturno
      };
    });
    // melhor opção por terra (a mais rápida porta a porta) — usada no "cenário terrestre"
    leg.terra = null;
    TERRESTRES.forEach(m => { if (leg.opts[m] && (!leg.terra || leg.opts[m].horas < leg.opts[leg.terra].horas)) leg.terra = m; });
    leg.modo = leg.opts[st.modo] ? st.modo : (leg.opts[def.padrao] ? def.padrao : (leg.terra || 'aviao'));
    return leg;
  }

  // Custo e tempo de um trecho em um modo. cenario: 'terrestre' | 'aviao' | 'meu'.
  function legCost(leg, modo, cenario) {
    const o = leg.opts[modo], st = leg.st;
    const temReal = modo === leg.modo && st.real.v !== '' && st.real.v != null;
    const transporte = temReal ? App.toBRL(st.real.v, st.real.cur) : App.toBRL(o.eurMid, 'EUR');
    let pernoite = 0, noites = 0;
    if (o.pernoite && (cenario === 'terrestre' || st.pernoite)) {
      noites = 1;
      pernoite = App.toBRL(st.hospedagem.v, st.hospedagem.cur);
    }
    return { transporte, pernoite, noites, horas: o.horas, real: temReal };
  }

  /* ============================================================================
     ROTA INTELIGENTE — problema do caixeiro-viajante (TSP)

     Procura a ordem das cidades que minimiza o tempo, o custo ou a distância
     total. Com até ~12 cidades dá para resolver de forma EXATA com programação
     dinâmica (algoritmo de Held-Karp, O(n²·2ⁿ)) em poucos milissegundos.

     Pontas da rota: por padrão a 1ª e a última cidade ficam fixas (chegada e
     saída dos voos internacionais) e só o "miolo" é reordenado. Sem pontas
     fixas, a rota começa e termina em Viracopos.
     ========================================================================== */
  App.CRITERIOS = { tempo: 'Menor tempo', custo: 'Menor custo', distancia: 'Menor distância' };
  const pontoDe = id => (id === 'vcp' ? D.origem : cityById[id]);

  // Custo de ir de "from" até "to" segundo o critério (usa o modo trem/avião escolhido no trecho).
  function pairCost(from, to, crit) {
    const km = distKm(pontoDe(from), pontoDe(to));
    if (crit === 'distancia') return km;
    // voo intercontinental: preço informado à parte; o tempo pesa só pela distância
    if (from === 'vcp' || to === 'vcp') return crit === 'tempo' ? km / 800 : 0;

    const { key, def } = legDef(from, to);
    const st = App.state.legs[key];
    let modo = st && def[st.modo] ? st.modo : def.padrao;
    if (!def[modo]) modo = MODOS.find(m => def[m]);
    const o = def[modo];
    if (crit === 'tempo') {
      const hReal = st && st.horas && num(st.horas[modo]) > 0 ? num(st.horas[modo]) : null;
      return (hReal || (o.h[0] + o.h[o.h.length - 1]) / 2) + (modo === 'aviao' ? D.estimativa.aviaoExtraH : 0);
    }

    const real = st && st.modo === modo && st.real && st.real.v !== '' && st.real.v != null;
    let brl = real ? App.toBRL(st.real.v, st.real.cur) : App.toBRL((o.eur[0] + o.eur[1]) / 2, 'EUR');
    if (o.pernoite && (!st || st.pernoite !== false)) {
      const h = st && isObj(st.hospedagem) ? st.hospedagem : D.config.hospedagemPernoite;
      brl += App.toBRL(h.v, h.cur);
    }
    return brl;
  }

  // Custo total de Viracopos → cidades (na ordem) → Viracopos.
  function routeCost(ids, crit) {
    const seq = ['vcp'].concat(ids, ['vcp']);
    let t = 0;
    for (let i = 0; i < seq.length - 1; i++) t += pairCost(seq[i], seq[i + 1], crit);
    return t;
  }

  // Held-Karp: melhor ordem para visitar "mid", saindo de "first" e chegando em "last".
  function heldKarp(mid, first, last, crit) {
    const n = mid.length;
    if (n <= 1) return mid.slice();
    const C = mid.map(a => mid.map(b => (a === b ? 0 : pairCost(a, b, crit))));
    const ini = mid.map(b => pairCost(first, b, crit)), fim = mid.map(a => pairCost(a, last, crit));
    const N = 1 << n;
    const dp = new Float64Array(N * n).fill(Infinity), pai = new Int8Array(N * n).fill(-1);
    for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = ini[j];
    for (let mask = 1; mask < N; mask++) {
      for (let j = 0; j < n; j++) {
        const v = dp[mask * n + j];
        if (!(mask & (1 << j)) || v === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (mask & (1 << k)) continue;
          const nm = mask | (1 << k), w = v + C[j][k];
          if (w < dp[nm * n + k]) { dp[nm * n + k] = w; pai[nm * n + k] = j; }
        }
      }
    }
    let best = Infinity, j = -1;
    for (let k = 0; k < n; k++) {
      const w = dp[(N - 1) * n + k] + fim[k];
      if (w < best - 1e-9) { best = w; j = k; }
    }
    const ordem = [];
    for (let mask = N - 1; j >= 0;) { ordem.push(mid[j]); const p = pai[mask * n + j]; mask &= ~(1 << j); j = p; }
    return ordem.reverse();
  }

  /* Acima de ~14 cidades o Held-Karp fica pesado (O(n²·2ⁿ)). A partir daí a rota é
     APROXIMADA: parte da ordem atual e do "vizinho mais próximo" e melhora com
     2-opt (inverte um pedaço do caminho) e Or-opt (muda de lugar blocos de 1 a 3
     cidades) até não haver mais ganho. */
  const HK_MAX = 13;     // máximo de cidades no "miolo" para a solução exata

  function heuristica(mid, first, last, crit) {
    const n = mid.length;
    if (n <= 2) return heldKarp(mid, first, last, crit);
    const nos = [first].concat(mid, [last]), N = nos.length;
    const C = nos.map(a => nos.map(b => (a === b ? 0 : pairCost(a, b, crit))));
    const custo = seq => { let t = 0; for (let i = 0; i < seq.length - 1; i++) t += C[seq[i]][seq[i + 1]]; return t; };

    const melhorar = seq => {
      let mudou = true, voltas = 0;
      while (mudou && voltas++ < 60) {
        mudou = false;
        // 2-opt: inverte seq[i..j] (as pontas 0 e N-1 ficam fixas)
        for (let i = 1; i < N - 2; i++) {
          for (let j = i + 1; j < N - 1; j++) {
            const d = C[seq[i - 1]][seq[j]] + C[seq[i]][seq[j + 1]] - C[seq[i - 1]][seq[i]] - C[seq[j]][seq[j + 1]];
            if (d < -1e-9) { for (let a = i, b = j; a < b; a++, b--) { const t = seq[a]; seq[a] = seq[b]; seq[b] = t; } mudou = true; }
          }
        }
        // Or-opt: move um bloco de 1 a 3 cidades para outra posição
        for (let len = 1; len <= 3; len++) {
          for (let i = 1; i + len <= N - 1; i++) {
            const bloco = seq.slice(i, i + len), resto = seq.slice(0, i).concat(seq.slice(i + len));
            const tirar = C[seq[i - 1]][seq[i]] + C[seq[i + len - 1]][seq[i + len]] - C[seq[i - 1]][seq[i + len]];
            let melhorK = -1, melhorD = -1e-9;
            for (let k = 1; k < resto.length; k++) {
              if (k === i) continue;
              const por = C[resto[k - 1]][bloco[0]] + C[bloco[len - 1]][resto[k]] - C[resto[k - 1]][resto[k]];
              if (por - tirar < melhorD) { melhorD = por - tirar; melhorK = k; }
            }
            if (melhorK >= 0) { seq = resto.slice(0, melhorK).concat(bloco, resto.slice(melhorK)); mudou = true; }
          }
        }
      }
      return seq;
    };

    // ponto de partida 1: a ordem recebida · ponto de partida 2: vizinho mais próximo
    const ini1 = nos.map((_, i) => i);
    const livre = new Set(ini1.slice(1, N - 1)), ini2 = [0];
    while (livre.size) {
      const u = ini2[ini2.length - 1];
      let v = -1;
      livre.forEach(x => { if (v < 0 || C[u][x] < C[u][v]) v = x; });
      ini2.push(v); livre.delete(v);
    }
    ini2.push(N - 1);
    const r1 = melhorar(ini1), r2 = melhorar(ini2);
    const r = custo(r2) < custo(r1) - 1e-9 ? r2 : r1;
    return r.slice(1, N - 1).map(i => nos[i]);
  }

  // Exato até HK_MAX cidades no miolo; acima disso, heurística.
  function melhorOrdem(mid, first, last, crit) {
    return mid.length <= HK_MAX ? heldKarp(mid, first, last, crit) : heuristica(mid, first, last, crit);
  }
  App.rotaAproximada = n => (App.state.otim.fixarPontas ? n - 2 : n) > HK_MAX;

  // Ordem ótima para "ids". "base" define as pontas fixas (normalmente a ordem atual).
  App.optimize = function (ids, base) {
    const S = App.state, crit = S.otim.criterio;
    if (ids.length < 2) return ids.slice();
    if (!S.otim.fixarPontas) return melhorOrdem(ids, 'vcp', 'vcp', crit);
    base = (base || ids).filter(id => ids.indexOf(id) >= 0);
    if (base.length < 2) base = ids;
    if (ids.length <= 2) return base.concat(ids.filter(id => base.indexOf(id) < 0));
    const first = base[0], last = base[base.length - 1];
    // o miolo entra na ordem atual (ponto de partida da heurística)
    const mid = base.filter(id => id !== first && id !== last).concat(ids.filter(id => base.indexOf(id) < 0));
    return [first].concat(melhorOrdem(mid, first, last, crit), [last]);
  };

  /* --------------------------------------------------- cálculo geral (derivado) */
  // opts.leve: pula a rota inteligente (usado em cálculos auxiliares, ex.: total com outro câmbio).
  function compute(opts) {
    const leve = !!(opts && opts.leve);
    const S = App.state;
    const route = App.route();

    // trechos: Viracopos → cidades → Viracopos
    const stops = route.length ? ['vcp'].concat(route, ['vcp']) : [];
    const legs = [];
    for (let i = 0; i < stops.length - 1; i++) legs.push(resolveLeg(stops[i], stops[i + 1]));

    // linha do tempo
    const segs = [], segByCity = {};
    let d = App.parseDate(S.dataSaida);
    segs.push({ type: 'ida', start: d, nights: D.config.noitesVooIda });
    d = App.addDays(d, D.config.noitesVooIda);
    route.forEach((id, i) => {
      const leg = legs[i];
      const o = leg.opts[leg.modo];
      if (o.pernoite && leg.st.pernoite && o.via) {
        segs.push({ type: 'pernoite', nome: o.via.nome, cityId: o.via.cityId || null, start: d, nights: 1 });
        d = App.addDays(d, 1);
      }
      const n = S.cities[id].noites;
      const seg = { type: 'cidade', cityId: id, start: d, nights: n, end: App.addDays(d, n) };
      segs.push(seg); segByCity[id] = seg;
      d = seg.end;
    });
    segs.push({ type: 'volta', start: d, nights: 0 });

    // custos
    const cats = { hospedagem: 0, alimentacao: 0, transporteLocal: 0, compras: 0, outros: 0, atracoes: 0, trechos: 0, gerais: 0 };
    const cities = {};
    route.forEach(id => {
      let sub = 0;
      const cs = S.cities[id];
      D.categorias.forEach(k => {
        const x = App.toBRL(cs.custos[k.id].v, cs.custos[k.id].cur);
        cats[k.id] += x; sub += x;
      });
      App.poisOf(id).forEach(p => {
        const ps = S.pois[p.id];
        if (!ps.sel) return;                         // só entra no total se estiver selecionado
        const x = App.toBRL(ps.valor.v, ps.valor.cur);
        cats.atracoes += x; sub += x;
        if (ps.transporte) {
          const t = App.toBRL(ps.transporte.v, ps.transporte.cur);
          cats.transporteLocal += t; sub += t;
        }
      });
      cities[id] = sub;
    });

    // cenários de transporte entre cidades
    // terrestre = o melhor entre trem, ônibus e balsa em cada trecho (avião só onde não há opção por terra)
    const cen = { terrestre: { brl: 0, h: 0, noites: 0 }, aviao: { brl: 0, h: 0, noites: 0 }, meu: { brl: 0, h: 0, noites: 0 } };
    legs.forEach(leg => {
      ['terrestre', 'aviao', 'meu'].forEach(c => {
        const modo = c === 'meu' ? leg.modo : c === 'terrestre' ? (leg.terra || 'aviao') : (leg.opts.aviao ? 'aviao' : leg.terra);
        const r = legCost(leg, modo, c);
        cen[c].brl += r.transporte + r.pernoite;
        cen[c].h += r.horas;
        cen[c].noites += r.noites;
        if (c === 'meu') { leg.custo = r; cats.trechos += r.transporte; cats.hospedagem += r.pernoite; }
      });
    });

    D.gerais.forEach(g => { cats.gerais += App.toBRL(S.gerais[g.id].v, S.gerais[g.id].cur); });

    const total = Object.keys(cats).reduce((a, k) => a + cats[k], 0);

    // rota inteligente: a ordem atual é a ótima? quanto se ganharia?
    const crit = S.otim.criterio, ideal = leve ? route : App.optimize(route, route);
    const otim = { crit, ideal, atual: routeCost(route, crit), melhor: routeCost(ideal, crit) };
    otim.diff = Math.max(0, otim.atual - otim.melhor);

    return { route, legs, segs, segByCity, cats, cities, cen, total, base: total - cen.meu.brl, otim };
  }

  // Total da viagem com outra tabela de câmbio (sem mexer no estado).
  App.totalCom = function (cambio) {
    const real = App.state.cambio;
    App.state.cambio = cambio;
    try { return compute({ leve: true }).total; } finally { App.state.cambio = real; }
  };

  /* ------------------------------------------------------ consultas derivadas */
  // Ponto "ativo" = selecionado E com a cidade no roteiro.
  App.poiActive = function (id) {
    const p = poiById[id];
    return !!(p && App.state.pois[id].sel && App.state.cities[p.cityId].sel);
  };

  // Dias (datas) em que a cidade está no roteiro: da chegada até a partida.
  App.cityDays = function (cityId) {
    const seg = App.calc.segByCity[cityId];
    if (!seg) return [];
    const out = [];
    for (let i = 0; i <= seg.nights; i++) out.push(App.addDays(seg.start, i));
    return out;
  };

  // Aviso de "fechado no dia" (ex.: Louvre às terças) conforme as datas calculadas.
  App.poiWarn = function (p) {
    if (!p.fechado || !App.poiActive(p.id)) return null;
    const days = App.cityDays(p.cityId);
    const fecha = d => p.fechado.indexOf(d.getUTCDay()) >= 0;
    const quais = p.fechado.map(i => DIAS_PLURAL[i]).join(' e ');
    const fmt = d => window.Fmt.data(d) + ' (' + DIAS[d.getUTCDay()] + ')';
    const dia = App.state.pois[p.id].dia;
    const marcado = dia && days.find(d => App.iso(d) === dia);
    if (marcado) {
      return fecha(marcado)
        ? { nivel: 'forte', datas: [App.iso(marcado)], texto: 'Fechado às ' + quais + ' — a visita está marcada para ' + fmt(marcado) + '. Escolha outro dia.' }
        : null;
    }
    const ruins = days.filter(fecha);
    if (!ruins.length) return null;
    return { nivel: 'leve', datas: ruins.map(App.iso), texto: 'Fechado às ' + quais + ' — evite ' + ruins.map(fmt).join(' e ') + ' na sua estadia.' };
  };

  /* ------------------------------------------------------- voos e hospedagem */
  // Hospedagem marcada pelo usuário na cidade (ou null).
  App.hosp = function (cityId) {
    const h = App.state.cities[cityId] && App.state.cities[cityId].hosp;
    return h && h.lat != null && h.lon != null && isFinite(h.lat) && isFinite(h.lon) ? h : null;
  };

  App.setHosp = function (cityId, lat, lon) {
    const h = App.state.cities[cityId].hosp;
    h.lat = lat == null ? null : Math.round(lat * 1e6) / 1e6;
    h.lon = lon == null ? null : Math.round(lon * 1e6) / 1e6;
    App.refresh();
  };

  // Marca a hospedagem clicando no mapa.
  App.pickHosp = function (cityId) {
    document.body.classList.remove('drawer-open');          // no celular, libera o mapa
    UI.toast('Clique no mapa onde fica a sua hospedagem em ' + cityById[cityId].nome + ' (Esc cancela).', 15000);
    MapView.pick((lat, lon) => {
      App.setHosp(cityId, lat, lon);
      UI.toast('Hospedagem marcada. As distâncias agora são medidas a partir dela.');
      if (App.focus) UI.showDetail();
    });
  };

  // Voos para uma cidade: da cidade anterior do roteiro (ou de Viracopos) na data de chegada;
  // se for a última cidade, inclui também a volta para Viracopos.
  App.flightsFor = function (cityId) {
    const c = App.calc, r = c.route, i = r.indexOf(cityId), saida = App.parseDate(App.state.dataSaida);
    const legOf = (a, b) => c.legs.find(l => l.from === a && l.to === b);
    if (i < 0) return [{ from: 'vcp', to: cityId, date: saida, fora: true }];
    const from = i === 0 ? 'vcp' : r[i - 1];
    const rows = [{ from, to: cityId, date: i === 0 ? saida : c.segByCity[cityId].start, leg: legOf(from, cityId) }];
    if (i === r.length - 1) rows.push({ from: cityId, to: 'vcp', date: c.segs[c.segs.length - 1].start, leg: legOf(cityId, 'vcp') });
    return rows;
  };

  /* --------------------------------------------------------------- atualização */
  // modo 'light': só números (não recria formulários, para não perder o foco ao digitar).
  // Margem para considerar uma ordem "melhor" (evita reordenar por diferenças desprezíveis).
  App.OTIM_TOL = { tempo: 0.05, custo: 1, distancia: 1 };

  // Recalcula tudo. Com a rota inteligente ligada, mantém o roteiro SEMPRE na melhor
  // ordem: se algo mudou (estimativas, trem/avião, valores reais...), reordena.
  function computeAuto() {
    App.calc = compute();
    const o = App.calc.otim;
    let ganho = 0;
    if (App.state.otim.auto && o.diff > App.OTIM_TOL[o.crit] && o.ideal.join() !== App.calc.route.join()) {
      renumber(o.ideal);
      App.calc = compute();
      ganho = o.diff;
    }
    extras();
    return ganho;
  }

  // Valores derivados que dependem de um segundo cálculo.
  function extras() {
    const info = App.state.cambioInfo;
    // quanto o total mudou desde a cotação anterior (câmbio automático)
    App.calc.deltaCambio = isObj(info.ant) ? App.calc.total - App.totalCom(merge(clone(App.state.cambio), info.ant)) : null;
  }

  App.refresh = function (modo) {
    const crit = App.state.otim.criterio, ganho = computeAuto();
    save();
    if (ganho) {
      modo = undefined;   // a ordem mudou: redesenha tudo
      UI.toast('Roteiro reordenado para a melhor rota: ' + UI.otimTxt(ganho, crit) + ' a menos.');
    }
    if (modo === 'light') UI.renderLight(); else UI.renderAll();
    MapView.update();
    window.Clima.carregar();      // clima das cidades do roteiro (só busca o que falta)
  };

  /* -------------------------------------------------------------------- ações */
  // Altera um valor do estado pelo caminho (ex.: "cities.londres.custos.hospedagem.v").
  App.set = function (path, value) {
    const keys = path.split('.');
    let o = App.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!isObj(o[keys[i]])) return;
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  };

  // Inclui uma cidade no roteiro, na melhor posição se a rota inteligente estiver ligada.
  // Retorna o texto "entre X e Y" para o aviso.
  function addToRoute(id) {
    const S = App.state, prev = App.route();
    S.cities[id].sel = true;
    const ids = prev.concat([id]);
    renumber(S.otim.auto ? App.optimize(ids, prev) : ids);
    const r = App.route(), i = r.indexOf(id);
    const nome = x => (x ? cityById[x].nome : D.origem.nomeCurto);
    return 'entre ' + nome(r[i - 1]) + ' e ' + nome(r[i + 1]);
  }

  App.toggleCity = function (id, on) {
    const S = App.state, cs = S.cities[id];
    const sel = on === undefined ? !cs.sel : !!on;
    if (sel === cs.sel) return;
    let onde = '';
    if (sel) { onde = addToRoute(id); MapView.ignite('city', id); }
    else {
      cs.sel = false;
      const r = App.route();
      renumber(S.otim.auto ? App.optimize(r, r) : r);
    }
    App.refresh();
    UI.toast(cityById[id].nome + (sel ? ' entrou no roteiro, ' + onde + '.' : ' saiu do roteiro.'));
  };

  // Manual → desliga a otimização automática (senão ela desfaria a ordem escolhida).
  function manualOrder() {
    if (!App.state.otim.auto) return;
    App.state.otim.auto = false;
    UI.toast('Rota inteligente desligada porque você reordenou à mão. Religue em "Meu roteiro".');
  }

  // Reordena agora pela melhor rota.
  App.optimizeNow = function () {
    const c = App.calc.otim, ganho = c.diff;
    renumber(App.optimize(App.route(), App.route()));
    App.refresh();
    UI.toast(ganho > 0 ? 'Rota otimizada: ' + UI.otimTxt(ganho, c.crit) + ' a menos.' : 'A rota já estava otimizada.');
  };

  // Muda uma opção da rota inteligente; se estiver ligada, reordena na hora.
  App.setOtim = function (k, v) {
    const S = App.state;
    S.otim[k] = v;
    if (S.otim.auto) {
      const antes = App.route().join();
      renumber(App.optimize(App.route(), App.route()));
      if (App.route().join() !== antes) UI.toast('Roteiro reordenado: ' + App.CRITERIOS[S.otim.criterio].toLowerCase() + '.');
    }
    App.refresh();
  };

  App.togglePoi = function (id) {
    const S = App.state, p = poiById[id], ps = S.pois[id];
    const ativo = App.poiActive(id);
    if (ativo) ps.sel = false;
    else {
      ps.sel = true;
      MapView.ignite('poi', id);
      if (!S.cities[p.cityId].sel) {            // incluir um ponto inclui a cidade dele
        const onde = addToRoute(p.cityId);
        MapView.ignite('city', p.cityId);
        UI.toast(cityById[p.cityId].nome + ' entrou no roteiro, ' + onde + '.');
      }
    }
    App.refresh();
  };

  App.moveCity = function (id, delta) {
    const route = App.route(), i = route.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= route.length) return;
    route.splice(i, 1); route.splice(j, 0, id);
    renumber(route);
    manualOrder();
    App.refresh();
  };

  App.reorderCity = function (id, targetId, depois) {
    if (id === targetId) return;
    const route = App.route().filter(x => x !== id);
    let j = route.indexOf(targetId);
    if (j < 0) return;
    if (depois) j++;
    route.splice(j, 0, id);
    renumber(route);
    manualOrder();
    App.refresh();
  };

  App.setNights = function (id, n) {
    App.state.cities[id].noites = Math.max(1, Math.min(60, Math.round(n) || 1));
    App.refresh();
  };

  App.setLegMode = function (key, modo) {
    const st = App.state.legs[key];
    if (!st || st.modo === modo) return;
    st.modo = modo;
    App.refresh();
  };

  App.setTag = function (tag) {
    App.state.tag = App.state.tag === tag ? null : tag;
    App.refresh();
  };

  /* ------------------------------------------------------- navegação / foco */
  App.focus = null;   // { type: 'city' | 'poi' | 'info', id }

  App.openCity = function (id) {
    App.focus = { type: 'city', id };
    UI.showDetail();
    MapView.focusCity(id);
    window.Clima.carregar();
  };
  App.openPoi = function (id) {
    App.focus = { type: 'poi', id };
    UI.showDetail();
    MapView.showPoi(id);
  };
  App.openInfo = function (id) {
    App.focus = { type: 'info', id };
    UI.showDetail();
  };
  App.closeDetail = function () {
    App.focus = null;
    UI.hideDetail();
    MapView.update();          // fotos dos pontos voltam a ser pontinhos
  };
  // Esc / "Ver Europa inteira": fecha o painel e volta ao zoom inicial.
  App.home = function () {
    App.closeDetail();
    MapView.reset();
  };

  /* ------------------------------------------- exportar / importar / restaurar */
  App.exportJSON = function () {
    const data = { app: 'viagem-europa', versao: 1, exportadoEm: new Date().toISOString(), estado: App.state };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'viagem-europa-' + App.iso(new Date()) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    UI.toast('Roteiro exportado.');
  };

  App.importJSON = function (text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { obj = null; }
    const src = obj && isObj(obj.estado) ? obj.estado : obj;
    if (!isObj(src) || !isObj(src.cities) || !isObj(src.pois)) {
      UI.toast('Arquivo inválido: não parece um roteiro exportado por este app.');
      return false;
    }
    App.state = sanitize(merge(defaults(), src));
    App.focus = null;
    UI.hideDetail();
    App.refresh();
    MapView.reset();
    UI.toast('Roteiro importado.');
    return true;
  };

  App.reset = function () {
    if (!window.confirm('Restaurar o roteiro padrão? Todas as suas escolhas e valores serão apagados.')) return;
    try { window.localStorage.removeItem(LS_KEY); } catch (e) { /* ok */ }
    App.state = defaults();
    App.focus = null;
    UI.hideDetail();
    App.refresh();
    MapView.reset();
    UI.toast('Roteiro padrão restaurado.');
  };

  /* ------------------------------------------------------------ inicialização */
  function init() {
    App.state = load();
    const ganhoInicial = computeAuto();   // ordem salva ficou desatualizada? já abre otimizada

    UI.init();          // monta a interface (o mapa precisa dela para saber a área livre)
    window.Cambio.bind();
    UI.renderAll();
    MapView.init();
    MapView.update();
    MapView.fitRoute(true);       // abre enquadrando o roteiro atual ("Ver Europa inteira" mostra tudo)
    MapView.loadWorld();
    if (ganhoInicial) {
      save();
      UI.toast('Roteiro reordenado para a melhor rota: ' + UI.otimTxt(ganhoInicial, App.state.otim.criterio) + ' a menos.');
    }

    window.Clima.carregar();
    window.Cambio.init();   // busca as cotações (modo automático) e o histórico de 90 dias

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const el = document.activeElement;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.blur();
      if (MapView.picking()) { MapView.cancelPick(); UI.toast('Marcação cancelada.'); return; }
      if (UI.hideCountryCard()) return;
      App.home();
    });

    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => MapView.resize(), 180);
    });
  }

  // Ganchos para a página de testes (tests/index.html), que carrega os scripts sem iniciar o app.
  App._t = { defaults, merge, sanitize, compute, heldKarp, heuristica, trainPath, caminho, estimar, pairCost, routeCost, legDef };
  if (!window.VIAGEM_TESTE) init();
})();
