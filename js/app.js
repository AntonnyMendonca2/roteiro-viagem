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
      tag: null
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
  function estimar(from, to) {
    const E = D.estimativa, a = cityById[from], b = cityById[to];
    const km = distKm(a, b);
    const tremH = km / E.tremKmh + E.tremExtraH;
    const tremEur = Math.max(E.tremEurMin, km * E.tremEurPorKm);
    const semTrem = a.semTrem || b.semTrem;
    return {
      padrao: semTrem || tremH > 9 ? 'aviao' : 'trem',
      trem: semTrem ? null : { desc: 'Trem (~' + Math.round(km) + ' km)', h: [tremH, tremH], eur: [Math.round(tremEur * 0.7 / 5) * 5, Math.round(tremEur * 1.3 / 5) * 5] },
      aviao: { desc: 'Voo (~' + Math.round(km) + ' km)', h: [km / E.aviaoKmh, km / E.aviaoKmh], eur: E.aviaoEur.slice() },
      aviso: semTrem ? 'Sem trem viável neste trecho — somente avião.' : ''
    };
  }

  function viaInfo(via) {
    if (!via) return null;
    if (via.cityId) { const c = cityById[via.cityId]; return { cityId: c.id, nome: c.nome, lat: c.lat, lon: c.lon }; }
    return via;
  }

  // Monta um trecho entre dois pontos da rota ('vcp' = Viracopos).
  function resolveLeg(from, to) {
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
    return { route, legs, segs, segByCity, cats, cities, cen, total, base: total - cen.meu.brl };
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
  App.refresh = function (modo) {
    save();
    App.calc = compute();
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

  App.toggleCity = function (id, on) {
    const S = App.state, cs = S.cities[id];
    const sel = on === undefined ? !cs.sel : !!on;
    if (sel === cs.sel) return;
    const route = App.route();
    cs.sel = sel;
    if (sel) { route.push(id); renumber(route); MapView.ignite('city', id); }
    else renumber(route.filter(x => x !== id));
    App.refresh();
    UI.toast(cityById[id].nome + (sel ? ' entrou no roteiro.' : ' saiu do roteiro.'));
  };

  App.togglePoi = function (id) {
    const S = App.state, p = poiById[id], ps = S.pois[id];
    const ativo = App.poiActive(id);
    if (ativo) ps.sel = false;
    else {
      ps.sel = true;
      MapView.ignite('poi', id);
      if (!S.cities[p.cityId].sel) {            // incluir um ponto inclui a cidade dele
        const route = App.route();
        S.cities[p.cityId].sel = true;
        route.push(p.cityId); renumber(route);
        MapView.ignite('city', p.cityId);
        UI.toast(cityById[p.cityId].nome + ' entrou no roteiro.');
      }
    }
    App.refresh();
  };

  App.moveCity = function (id, delta) {
    const route = App.route(), i = route.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= route.length) return;
    route.splice(i, 1); route.splice(j, 0, id);
    renumber(route);
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
    App.calc = compute();

    UI.init();          // monta a interface (o mapa precisa dela para saber a área livre)
    UI.renderAll();
    MapView.init();
    MapView.update();
    MapView.loadWorld();

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
