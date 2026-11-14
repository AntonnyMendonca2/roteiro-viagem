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
      cities: {}, pois: {}, legs: {}, gerais: {},
      tag: null,
      otim: { auto: true, criterio: 'tempo', fixarPontas: true }   // rota inteligente
    };
    D.cities.forEach(c => {
      const custos = {};
      D.categorias.forEach(k => { custos[k.id] = { v: '', cur: 'BRL' }; });
      s.cities[c.id] = { sel: !!c.selecionada, noites: c.noites || 1, ordem: c.ordem || 99, custos };
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
      if (raw) merge(s, JSON.parse(raw));
    } catch (e) { /* sem localStorage (ou dado corrompido): segue com o padrão */ }
    return sanitize(s);
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
    return s;
  }

  /* ----------------------------------------------------------------- câmbio */
  App.toBRL = function (v, cur) {
    v = num(v);
    if (!v || cur === 'BRL') return v;
    const taxa = num(App.state.cambio[cur]);
    return v * taxa * (App.state.iof ? 1 + D.config.iofPct / 100 : 1);
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

  // Estimativa automática para pares de cidades que não estão na tabela de trechos.
  // Caminho de trem mais rápido usando só os trechos da tabela (Dijkstra).
  // Ex.: Londres → Zurique = Eurostar até Paris + TGV Lyria.
  const BALDEACAO_H = 0.5;   // tempo de troca de trem em cada parada
  const midH = o => (o.h[0] + o.h[o.h.length - 1]) / 2;

  function trainPath(from, to) {
    const dist = {}, prev = {}, edge = {}, done = {};
    D.cities.forEach(c => { dist[c.id] = Infinity; });
    dist[from] = 0;
    for (;;) {
      let u = null;
      D.cities.forEach(c => { if (!done[c.id] && dist[c.id] < Infinity && (u === null || dist[c.id] < dist[u])) u = c.id; });
      if (u === null || u === to) break;
      done[u] = true;
      D.legs.forEach(l => {
        if (!l.trem || (l.a !== u && l.b !== u)) return;
        const v = l.a === u ? l.b : l.a, w = dist[u] + midH(l.trem) + BALDEACAO_H;
        if (w < dist[v]) { dist[v] = w; prev[v] = u; edge[v] = l; }
      });
    }
    if (dist[to] === Infinity) return null;
    const ids = [to], legs = [];
    for (let x = to; x !== from; x = prev[x]) { ids.unshift(prev[x]); legs.unshift(edge[x]); }
    const vias = [];
    legs.forEach((l, i) => {
      if (l.trem.via) vias.push(l.trem.via);
      if (i < legs.length - 1) vias.push({ cityId: ids[i + 1] });
    });
    const h = legs.reduce((s, l) => s + midH(l.trem), 0) + BALDEACAO_H * (legs.length - 1);
    return {
      desc: legs.map(l => l.trem.desc).join(' + '),
      h: [h, h],
      eur: [legs.reduce((s, l) => s + l.trem.eur[0], 0), legs.reduce((s, l) => s + l.trem.eur[1], 0)],
      vias
    };
  }

  // Estimativa para pares que não estão na tabela de trechos.
  function estimar(from, to) {
    const E = D.estimativa, a = cityById[from], b = cityById[to];
    const km = distKm(a, b);
    const semTrem = a.semTrem || b.semTrem;
    let trem = null;
    if (!semTrem) {
      const h = km / E.tremKmh + E.tremExtraH, eur = Math.max(E.tremEurMin, km * E.tremEurPorKm);
      const direto = { desc: 'Trem (~' + Math.round(km) + ' km)', h: [h, h], eur: [Math.round(eur * 0.7 / 5) * 5, Math.round(eur * 1.3 / 5) * 5] };
      const rede = trainPath(from, to);
      // cidade que só sai de trem pelos trechos da tabela (ex.: Londres → Eurostar): usa a rede, sempre.
      // nas demais, a rede vale se não for muito mais lenta que a linha reta (que é otimista).
      if (a.tremSoListado || b.tremSoListado) trem = rede;
      else trem = rede && rede.h[0] <= direto.h[0] * 1.2 ? rede : direto;
    }
    return {
      padrao: !trem || trem.h[0] > 9 ? 'aviao' : 'trem',
      trem,
      aviao: { desc: 'Voo (~' + Math.round(km) + ' km)', h: [km / E.aviaoKmh, km / E.aviaoKmh], eur: E.aviaoEur.slice() },
      aviso: trem ? '' : 'Sem trem viável neste trecho — somente avião.'
    };
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
      if (ida && D.origem.viaIda && cid !== D.origem.viaIda) def.aviao.via = { cityId: D.origem.viaIda };
    } else {
      key = [from, to].sort().join('~');
      def = D.legs.find(l => (l.a === from && l.b === to) || (l.a === to && l.b === from));
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
    if (st.modo !== 'trem' && st.modo !== 'aviao') st.modo = def.padrao;
    if (!isObj(st.real)) st.real = { v: '', cur: 'EUR' };
    if (typeof st.pernoite !== 'boolean') st.pernoite = true;   // pernoite é o recomendado
    if (!isObj(st.hospedagem)) st.hospedagem = clone(D.config.hospedagemPernoite);

    const leg = { key, from, to, intl, est, aviso: def.aviso || '', st, opts: {} };
    ['trem', 'aviao'].forEach(m => {
      const o = def[m];
      if (!o) return;
      const extra = (m === 'aviao' && !o.total) ? D.estimativa.aviaoExtraH : 0;
      leg.opts[m] = {
        desc: o.desc || '',
        h: o.h,
        extra,
        horas: (o.h[0] + o.h[o.h.length - 1]) / 2 + extra,     // porta a porta
        eur: o.eur || null,
        eurMid: o.eur ? (o.eur[0] + o.eur[1]) / 2 : 0,
        via: viaInfo(o.via),
        vias: (o.vias || (o.via ? [o.via] : [])).map(viaInfo),     // paradas no caminho (mapa)
        pernoite: !!o.pernoite
      };
    });
    leg.modo = leg.opts[st.modo] ? st.modo : (leg.opts.trem ? 'trem' : 'aviao');
    return leg;
  }

  // Custo e tempo de um trecho em um modo. cenario: 'trem' | 'aviao' | 'meu'.
  function legCost(leg, modo, cenario) {
    const o = leg.opts[modo], st = leg.st;
    const temReal = modo === leg.modo && st.real.v !== '' && st.real.v != null;
    const transporte = temReal ? App.toBRL(st.real.v, st.real.cur) : App.toBRL(o.eurMid, 'EUR');
    let pernoite = 0, noites = 0;
    if (o.pernoite && (cenario === 'trem' || st.pernoite)) {
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
    if (!def[modo]) modo = def.trem ? 'trem' : 'aviao';
    const o = def[modo];
    if (crit === 'tempo') return (o.h[0] + o.h[o.h.length - 1]) / 2 + (modo === 'aviao' ? D.estimativa.aviaoExtraH : 0);

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

  // Ordem ótima para "ids". "base" define as pontas fixas (normalmente a ordem atual).
  App.optimize = function (ids, base) {
    const S = App.state, crit = S.otim.criterio;
    if (ids.length < 2) return ids.slice();
    if (!S.otim.fixarPontas) return heldKarp(ids, 'vcp', 'vcp', crit);
    base = (base || ids).filter(id => ids.indexOf(id) >= 0);
    if (base.length < 2) base = ids;
    if (ids.length <= 2) return base.concat(ids.filter(id => base.indexOf(id) < 0));
    const first = base[0], last = base[base.length - 1];
    return [first].concat(heldKarp(ids.filter(id => id !== first && id !== last), first, last, crit), [last]);
  };

  /* --------------------------------------------------- cálculo geral (derivado) */
  function compute() {
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
    const cen = { trem: { brl: 0, h: 0, noites: 0 }, aviao: { brl: 0, h: 0, noites: 0 }, meu: { brl: 0, h: 0, noites: 0 } };
    legs.forEach(leg => {
      ['trem', 'aviao', 'meu'].forEach(c => {
        const modo = c === 'meu' ? leg.modo : (leg.opts[c] ? c : (c === 'trem' ? 'aviao' : 'trem'));
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
    const crit = S.otim.criterio, ideal = App.optimize(route, route);
    const otim = { crit, ideal, atual: routeCost(route, crit), melhor: routeCost(ideal, crit) };
    otim.diff = Math.max(0, otim.atual - otim.melhor);

    return { route, legs, segs, segByCity, cats, cities, cen, total, base: total - cen.meu.brl, otim };
  }

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

  /* --------------------------------------------------------------- atualização */
  // modo 'light': só números (não recria formulários, para não perder o foco ao digitar).
  // Margem para considerar uma ordem "melhor" (evita reordenar por diferenças desprezíveis).
  App.OTIM_TOL = { tempo: 0.05, custo: 1, distancia: 1 };

  // Recalcula tudo. Com a rota inteligente ligada, mantém o roteiro SEMPRE na melhor
  // ordem: se algo mudou (estimativas, trem/avião, valores reais...), reordena.
  function computeAuto() {
    App.calc = compute();
    const o = App.calc.otim;
    if (!App.state.otim.auto || o.diff <= App.OTIM_TOL[o.crit] || o.ideal.join() === App.calc.route.join()) return 0;
    renumber(o.ideal);
    App.calc = compute();
    return o.diff;
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
    UI.renderAll();
    MapView.init();
    MapView.update();
    MapView.loadWorld();
    if (ganhoInicial) {
      save();
      UI.toast('Roteiro reordenado para a melhor rota: ' + UI.otimTxt(ganhoInicial, App.state.otim.criterio) + ' a menos.');
    }

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const el = document.activeElement;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.blur();
      App.home();
    });

    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => MapView.resize(), 180);
    });
  }

  init();
})();
