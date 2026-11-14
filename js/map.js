/* ==========================================================================
   map.js — mapa D3 (projeção cônica conforme), marcadores, rotas e animações.

   Camadas (de baixo para cima): países → hachura → rotas → bate-voltas →
   cidades → pontos → área informativa → ícone em movimento → efeitos.

   Os marcadores têm tamanho fixo na tela: cada um recebe scale(1/k) quando o
   zoom muda. As linhas usam a variável CSS --k para manter a espessura.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const M = window.MapView = {};
  const A = () => window.App;

  const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json';
  // Pontos que definem o enquadramento inicial ("Europa inteira").
  const FRAME = { type: 'MultiPoint', coordinates: [[-16, 36], [-16, 58], [36, 36.5], [36, 58], [10, 59.5], [10, 35.2]] };
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const POI_ZOOM = 4;          // a partir deste zoom os pontos de interesse aparecem
  const PX_KM_MAX = 70;        // zoom máximo ao enquadrar uma cidade (px por km)

  let svg, node, root, hatch;
  const L = {};
  let projection, geoPath, zoom, T = d3.zoomIdentity;
  let features = null, ready = false, routeSig = null;
  let cityPts = [], poiPts = [], infoPts = [], vcp = { id: 'vcp', x: 0, y: 0 }, pxKm = 1;
  let mover = null, drawTimer = null, cardTimer = null, lastPointer = 'mouse';
  let card, tip;

  const esc = s => window.UI.esc(s);
  const place = sel => sel.attr('transform', d => 'translate(' + d.x + ',' + d.y + ') scale(' + (1 / T.k) + ')');

  /* ====================================================================== init */
  M.init = function () {
    svg = d3.select('#map');
    node = svg.node();
    hatch = svg.select('#hatch');
    root = svg.append('g').attr('class', 'zoom-layer');
    ['countries', 'hatch', 'routes', 'trips', 'cities', 'pois', 'info', 'mover', 'fx'].forEach(n => {
      L[n] = root.append('g').attr('class', 'l-' + n);
    });
    card = document.getElementById('hovercard');
    tip = document.getElementById('tip');

    zoom = d3.zoom().scaleExtent([0.7, 6000]).on('zoom', onZoom);
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', hideCard);
    window.addEventListener('pointerdown', e => { lastPointer = e.pointerType || 'mouse'; }, true);

    layout();
  };

  /* ======================================================= projeção e posições */
  function layout() {
    const r = A().viewRect(), mobile = A().isMobile(), pad = mobile ? 12 : 30;
    const W = window.innerWidth, H = window.innerHeight;
    projection = d3.geoConicConformal().parallels([42, 58]).rotate([-10, 0]);
    projection.fitExtent([[r.x0 + pad, r.y0 + pad], [Math.max(r.x0 + pad + 50, r.x1 - pad), Math.max(r.y0 + pad + 50, r.y1 - pad)]], FRAME);
    projection.clipExtent([[-W, -H], [2 * W, 2 * H]]);
    geoPath = d3.geoPath(projection);
    zoom.translateExtent([[-W, -H], [2 * W, 2 * H]]);

    const P = o => { const p = projection([o.lon, o.lat]); return { x: p[0], y: p[1] }; };
    cityPts = D.cities.map(c => Object.assign({ id: c.id, c }, P(c)));
    poiPts = D.pois.map(p => Object.assign({ id: p.id, p }, P(p)));
    infoPts = D.info.map(i => Object.assign({ id: i.id, i }, P(i)));
    // Viracopos fica fora do recorte: marcador fixo no canto inferior esquerdo.
    vcp = { id: 'vcp', x: r.x0 + (mobile ? 34 : 70), y: r.y1 - (mobile ? 26 : 44) };

    const a = projection([10, 50]), b = projection([10, 51]);
    pxKm = Math.hypot(a[0] - b[0], a[1] - b[1]) / 111.2;

    drawCountries();
    drawMarkers();
    routeSig = null;
  }

  const cityPt = id => (id === 'vcp' ? vcp : cityPts.find(c => c.id === id));
  const viaPt = via => { const p = projection([via.lon, via.lat]); return { x: p[0], y: p[1] }; };

  /* ==================================================================== países */
  function drawCountries() {
    if (!features) return;
    L.countries.selectAll('path').data(features).join('path').attr('class', 'country').attr('d', geoPath);
    L.hatch.selectAll('path').data(features.filter(f => +f.id === D.infoArea.paisIso)).join('path').attr('class', 'hatch').attr('d', geoPath);
    countryState();
  }

  // Países com alguma cidade selecionada ficam em cinza claro.
  function countryState() {
    const S = A().state, ativos = new Set();
    D.cities.forEach(c => { if (S.cities[c.id].sel) ativos.add(c.paisIso); });
    L.countries.selectAll('path').classed('active', d => ativos.has(+d.id));
  }

  M.loadWorld = function () {
    const done = () => {
      ready = true;
      node.classList.add('ready');
      const ld = document.getElementById('loading');
      if (ld) ld.remove();
      setTimeout(() => M.update(), 500);      // desenha a rota depois do fade do mapa
    };
    return d3.json(WORLD_URL).then(topo => {
      const all = topojson.feature(topo, topo.objects.countries).features;
      // só o entorno da Europa (a projeção cônica não serve para o mundo todo)
      features = all.filter(f => {
        const c = d3.geoCentroid(f);
        return (c[0] > -60 && c[0] < 95 && c[1] > 8 && c[1] < 85) || +f.id === 643;
      });
      drawCountries();
      done();
    }).catch(() => {
      window.UI.toast('Não foi possível carregar o contorno dos países (sem internet?). O roteiro continua funcionando.');
      done();
    });
  };

  /* ================================================================ marcadores */
  const LBL = {
    e: { x: 12, y: 4, a: 'start', sx: 12, sy: 17 },
    w: { x: -12, y: 4, a: 'end', sx: -12, sy: 17 },
    n: { x: 0, y: -11, a: 'middle', sx: 0, sy: 20 },
    s: { x: 0, y: 19, a: 'middle', sx: 0, sy: 31 }
  };

  function drawMarkers() {
    // bate-voltas: linhas tracejadas finas da cidade até o ponto
    L.trips.selectAll('path').data(poiPts.filter(d => d.p.bateVolta), d => d.id).join('path')
      .attr('class', 'trip')
      .attr('d', d => { const c = cityPt(d.p.cityId); return 'M' + c.x + ',' + c.y + 'L' + d.x + ',' + d.y; });

    // cidades (+ Viracopos)
    const cities = L.cities.selectAll('g.city').data(cityPts, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk city');
      g.append('circle').attr('class', 'pulse').attr('r', 6);
      g.append('circle').attr('class', 'dot').attr('r', 5.5);
      g.append('text').attr('class', 'lbl');
      g.append('text').attr('class', 'sub');
      g.append('circle').attr('class', 'hit').attr('r', 15);
      bindPoint(g, 'city');
      return g;
    });
    cities.each(function (d) {
      const o = LBL[d.c.rotulo] || LBL.e, g = d3.select(this);
      g.select('.lbl').attr('x', o.x).attr('y', o.y).attr('text-anchor', o.a).text(d.c.nome);
      g.select('.sub').attr('x', o.sx).attr('y', o.sy).attr('text-anchor', o.a);
    });
    place(cities);

    const v = L.cities.selectAll('g.vcp').data([vcp]).join(enter => {
      const g = enter.append('g').attr('class', 'mk vcp');
      g.append('circle').attr('class', 'dot').attr('r', 11);
      g.append('path').attr('d', window.ICONS.aviao).attr('transform', 'translate(-7.2,-7.2) scale(0.6)');
      g.append('text').attr('class', 'lbl').attr('x', 16).attr('y', 4).text(D.origem.nome);
      g.append('circle').attr('class', 'hit').attr('r', 16);
      bindPoint(g, 'vcp');
      return g;
    });
    place(v);

    // pontos de interesse
    const pois = L.pois.selectAll('g.poi').data(poiPts, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk poi');
      g.append('circle').attr('class', 'pulse').attr('r', 5);
      g.append('circle').attr('class', 'dot').attr('r', 4.5);
      g.append('text').attr('class', 'wbadge').attr('x', 6).attr('y', -5).text('!');
      g.append('circle').attr('class', 'hit').attr('r', 11);
      bindPoint(g, 'poi');
      return g;
    });
    place(pois);

    // área informativa (Ucrânia): ícones de alerta
    const info = L.info.selectAll('g.info').data(infoPts, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk info');
      g.append('path').attr('class', 'tri').attr('d', 'M0,-9 L9,7 L-9,7 Z');
      g.append('text').attr('y', 5).attr('text-anchor', 'middle').text('!');
      g.append('circle').attr('class', 'hit').attr('r', 14);
      bindPoint(g, 'info');
      return g;
    });
    place(info);
  }

  // Hover (card), clique (ripple + painel) e toque em qualquer marcador.
  function bindPoint(sel, type) {
    sel.on('pointerenter', (e, d) => { if (e.pointerType === 'mouse') showCard(type, d); })
      .on('pointerleave', e => { if (e.pointerType === 'mouse') hideCard(); })
      .on('click', (e, d) => {
        e.stopPropagation();
        ripple(d);
        if (type === 'city') A().openCity(d.id);
        else if (type === 'poi') A().openPoi(d.id);
        else if (type === 'info') A().openInfo(d.id);
        // no toque não existe hover: o card aparece junto com o clique (se couber acima do ponto)
        if (lastPointer !== 'mouse' && type !== 'city' && T.y + d.y * T.k >= 270) {
          showCard(type, d);
          cardTimer = setTimeout(hideCard, 2600);
        }
      });
  }

  /* ================================================================ hover card */
  function describe(type, d) {
    const App = A(), S = App.state;
    if (type === 'city') {
      const c = d.c, sel = S.cities[c.id].sel;
      return { nome: c.nome, wiki: c.wiki,
        preco: sel ? S.cities[c.id].noites + (S.cities[c.id].noites === 1 ? ' noite' : ' noites') + ' · ' + window.Fmt.brl(App.calc.cities[c.id] || 0) : (c.papel || c.pais),
        status: sel ? 'Selecionada' : 'Não selecionada', on: sel };
    }
    if (type === 'poi') {
      const p = d.p, on = App.poiActive(p.id), w = App.poiWarn(p);
      return { nome: p.nome, wiki: p.wiki, preco: p.preco.label, status: on ? 'Selecionado' : 'Não selecionado', on, aviso: w ? w.texto : '' };
    }
    if (type === 'info') return { nome: d.i.nome, wiki: d.i.wiki, preco: 'Somente informativo', status: 'Não selecionável', on: false, aviso: d.i.aviso };
    return { nome: D.origem.nome, wiki: D.origem.wiki, preco: 'Aeroporto de Viracopos', status: 'Origem e destino', on: true };
  }

  function showCard(type, d) {
    const i = describe(type, d);
    clearTimeout(cardTimer);
    card.innerHTML = window.UI.photo(i.wiki, i.nome) +
      '<div class="hc-body"><div class="hc-name">' + esc(i.nome) + '</div>' +
      '<div class="hc-meta"><span>' + esc(i.preco) + '</span><span class="st ' + (i.on ? 'on' : '') + '">' + esc(i.status) + '</span></div>' +
      (i.aviso ? '<div class="hc-warn">' + esc(i.aviso) + '</div>' : '') + '</div>';
    window.UI.hydratePhotos(card);
    const sx = T.x + d.x * T.k, sy = T.y + d.y * T.k;
    card.style.left = Math.max(124, Math.min(window.innerWidth - 124, sx)) + 'px';
    card.style.top = sy + 'px';
    card.classList.toggle('below', sy < 270);
    card.classList.remove('show');
    void card.offsetWidth;                         // reinicia a animação de entrada
    card.classList.add('show');
  }

  function hideCard() {
    clearTimeout(cardTimer);
    if (card) card.classList.remove('show');
  }

  /* ============================================================= efeitos (fx) */
  function ripple(d) {
    const g = L.fx.append('g').attr('class', 'mk').datum({ x: d.x, y: d.y });
    place(g);
    g.append('circle').attr('class', 'ripple').attr('r', 6);
    setTimeout(() => g.remove(), 750);
  }

  // Animação de "acender" ao selecionar (cinza → destaque, escala 1 → 1.4 → 1).
  M.ignite = function (type, id) {
    const sel = (type === 'city' ? L.cities.selectAll('g.city') : L.pois.selectAll('g.poi')).filter(d => d.id === id).select('.dot');
    sel.classed('ignite', false);
    if (sel.node()) void sel.node().getBoundingClientRect();
    sel.classed('ignite', true);
    setTimeout(() => sel.classed('ignite', false), 800);
  };

  /* ===================================================================== rotas */
  // Arco curvo entre dois pontos. Avião: curva alta para a esquerda do sentido
  // da viagem; trem: curva suave para a direita (assim os dois não se sobrepõem).
  function arc(a, b, modo) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const k = modo === 'aviao' ? 0.2 : -0.07;
    const cx = (a.x + b.x) / 2 + (dy / len) * len * k, cy = (a.y + b.y) / 2 + (-dx / len) * len * k;
    return {
      d: 'M' + a.x + ',' + a.y + 'Q' + cx + ',' + cy + ' ' + b.x + ',' + b.y,
      mid: { x: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cy + 0.25 * b.y }
    };
  }

  function drawRoutes(animate) {
    stopMover();
    clearTimeout(drawTimer);
    hideTip();
    L.routes.selectAll('*').remove();
    const legs = A().calc.legs, segs = [];
    const gAlt = L.routes.append('g'), gAct = L.routes.append('g'), gHit = L.routes.append('g'), gMk = L.routes.append('g');

    const legPaths = (leg, modo, active) => {
      const o = leg.opts[modo];
      const pts = [cityPt(leg.from)];
      if (o.via) pts.push(viaPt(o.via));
      pts.push(cityPt(leg.to));
      for (let i = 0; i < pts.length - 1; i++) {
        const geo = arc(pts[i], pts[i + 1], modo);
        const p = (active ? gAct : gAlt).append('path').attr('class', 'route ' + (active ? 'active ' : 'alt ') + modo).attr('d', geo.d);
        gHit.append('path').attr('class', 'route-hit').attr('d', geo.d)
          .on('pointerenter pointermove', e => { p.classed('hover', true); showTip(e, leg, modo, active); })
          .on('pointerleave', () => { p.classed('hover', false); hideTip(); })
          .on('click', e => { e.stopPropagation(); showTip(e, leg, modo, active); if (lastPointer !== 'mouse') setTimeout(() => { p.classed('hover', false); hideTip(); }, 2600); });
        if (active) {
          segs.push({ el: p.node(), modo });
          const b = gMk.append('g').attr('class', 'mk badge').datum(geo.mid);
          b.append('circle').attr('r', 9);
          b.append('path').attr('d', window.ICONS[modo]).attr('transform', 'translate(-6,-6) scale(0.5)');
          place(b);
        }
      }
      if (active && o.via) {                       // parada intermediária (ex.: Berlim, Milão)
        const s = gMk.append('g').attr('class', 'mk stop').datum(viaPt(o.via));
        s.append('circle').attr('r', o.via.cityId ? 9 : 4);
        if (!o.via.cityId) s.append('text').attr('x', 8).attr('y', 4).text(o.via.nome + ' (parada)');
        place(s);
      }
    };

    legs.forEach(leg => {                          // alternativa (modo não escolhido) por baixo
      const outro = leg.modo === 'trem' ? 'aviao' : 'trem';
      if (leg.opts[outro]) legPaths(leg, outro, false);
    });
    legs.forEach(leg => legPaths(leg, leg.modo, true));

    if (animate && !REDUCED && segs.length) {
      // "desenha" a rota trecho por trecho com stroke-dashoffset
      const step = 380, dur = 700;
      segs.forEach((s, i) => {
        s.el.setAttribute('pathLength', '1');
        s.el.style.strokeDasharray = '1 1';
        const an = s.el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
          { duration: dur, delay: i * step, easing: 'ease-in-out', fill: 'backwards' });
        an.onfinish = () => { s.el.style.strokeDasharray = ''; s.el.removeAttribute('pathLength'); };
      });
      gMk.selectAll('g.badge').classed('pop', true).style('animation-delay', (d, i) => (i * step + dur * 0.5) + 'ms');
      gAlt.attr('class', 'fade-in');
      drawTimer = setTimeout(() => startMover(segs), (segs.length - 1) * step + dur + 100);
    } else {
      startMover(segs);
    }
  }

  /* ----------------------------------------- ícone que percorre a rota em loop */
  function startMover(segs) {
    stopMover();
    if (REDUCED || !segs.length) return;
    const g = L.mover.append('g').attr('class', 'mover');
    g.append('circle').attr('r', 12);
    const ic = g.append('path');
    const lens = segs.map(s => s.el.getTotalLength());
    const per = 3800, t0 = performance.now();
    const me = mover = { g, raf: 0 };
    let cur = -1;
    const frame = now => {
      if (mover !== me) return;
      const e = (now - t0) / per, i = Math.floor(e) % segs.length, f = e - Math.floor(e);
      const s = segs[i], len = lens[i], l = f * len;
      const p = s.el.getPointAtLength(l);
      if (cur !== i) { cur = i; ic.attr('d', window.ICONS[s.modo]); }
      let rot = 0;
      if (s.modo === 'aviao') {
        const p0 = s.el.getPointAtLength(Math.max(0, l - len * 0.01)), p1 = s.el.getPointAtLength(Math.min(len, l + len * 0.01));
        rot = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI + 90;
      }
      g.attr('transform', 'translate(' + p.x + ',' + p.y + ') scale(' + (1 / T.k) + ')');
      ic.attr('transform', 'rotate(' + rot + ') translate(-7.8,-7.8) scale(0.65)');
      me.raf = requestAnimationFrame(frame);
    };
    me.raf = requestAnimationFrame(frame);
  }

  function stopMover() {
    if (!mover) return;
    cancelAnimationFrame(mover.raf);
    mover.g.remove();
    mover = null;
  }

  /* ------------------------------------------------- tooltip do trecho (hover) */
  function showTip(e, leg, modo, active) {
    const t = window.UI.legText(leg, modo);
    tip.innerHTML = '<b>' + esc(t.titulo) + '</b><span>' + esc(t.modo) + (active ? '' : ' (alternativa)') + ' · ' + esc(t.tempo) + '</span><span>' +
      esc(t.desc) + ' · ' + esc(t.preco) + '</span>';
    tip.style.left = Math.max(130, Math.min(window.innerWidth - 130, e.clientX)) + 'px';
    tip.style.top = (e.clientY - 16) + 'px';
    tip.classList.toggle('below', e.clientY < 110);
    tip.classList.add('show');
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }

  /* ====================================================== estado → aparência */
  M.update = function () {
    const App = A(), S = App.state, calc = App.calc, tag = S.tag;

    L.cities.selectAll('g.city')
      .classed('sel', d => S.cities[d.id].sel)
      .classed('dim', d => !!tag && !App.poisOf(d.id).some(p => p.tags.indexOf(tag) >= 0))
      .classed('focus', d => !!App.focus && App.focus.type === 'city' && App.focus.id === d.id)
      .each(function (d) {
        // rótulo de subtotal ao lado de cada cidade do roteiro
        d3.select(this).select('.sub').text(S.cities[d.id].sel ? window.Fmt.brl(calc.cities[d.id] || 0) : '');
      });

    const pois = L.pois.selectAll('g.poi')
      .classed('sel', d => App.poiActive(d.id))
      .classed('off', d => !!tag && d.p.tags.indexOf(tag) < 0)
      .classed('focus', d => !!App.focus && App.focus.type === 'poi' && App.focus.id === d.id)
      .each(function (d) {
        const w = App.poiWarn(d.p);
        d3.select(this).classed('warn', !!w).classed('warn-forte', !!w && w.nivel === 'forte');
      });
    pois.filter(d => App.poiActive(d.id)).raise();

    L.trips.selectAll('path')
      .classed('sel', d => App.poiActive(d.id))
      .classed('off', d => !!tag && d.p.tags.indexOf(tag) < 0);

    countryState();

    if (ready) {
      const sig = calc.legs.map(l => l.key + ':' + l.modo).join('|');
      if (sig !== routeSig) { routeSig = sig; drawRoutes(true); }
    }
  };

  /* ====================================================================== zoom */
  function onZoom(e) {
    T = e.transform;
    root.attr('transform', T);
    node.style.setProperty('--k', T.k);
    hatch.attr('patternTransform', 'rotate(45) scale(' + (1 / T.k) + ')');
    place(root.selectAll('.mk'));
    node.classList.toggle('lvl-city', T.k >= POI_ZOOM);
    document.body.classList.toggle('zoomed', T.k > 1.03 || Math.abs(T.x) > 3 || Math.abs(T.y) > 3);
    hideCard();
    hideTip();
  }

  function go(k, cx, cy, dur) {
    const r = A().viewRect();
    const t = d3.zoomIdentity.translate((r.x0 + r.x1) / 2 - k * cx, (r.y0 + r.y1) / 2 - k * cy).scale(k);
    svg.transition().duration(REDUCED ? 0 : (dur || 900)).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }

  function fitPoints(list) {
    const r = A().viewRect(), pad = A().isMobile() ? 34 : 70;
    const x0 = d3.min(list, d => d.x), x1 = d3.max(list, d => d.x), y0 = d3.min(list, d => d.y), y1 = d3.max(list, d => d.y);
    const w = Math.max(60, r.x1 - r.x0 - 2 * pad), h = Math.max(60, r.y1 - r.y0 - 2 * pad);
    const k = Math.max(1, Math.min(PX_KM_MAX / pxKm, w / Math.max(x1 - x0, 1e-6), h / Math.max(y1 - y0, 1e-6)));
    go(k, (x0 + x1) / 2, (y0 + y1) / 2);
  }

  // Zoom na cidade. Por padrão enquadra o centro (sem bate-voltas); all = true inclui todos.
  M.focusCity = function (id, all) {
    const c = cityPt(id);
    if (!c) return;
    fitPoints([c].concat(poiPts.filter(d => d.p.cityId === id && (all || !d.p.bateVolta))));
    M.update();
  };

  // Garante que o ponto esteja visível (dá zoom na cidade se o mapa estiver longe).
  M.showPoi = function (id) {
    const d = poiPts.find(p => p.id === id);
    if (!d) return;
    const r = A().viewRect(), sx = T.x + d.x * T.k, sy = T.y + d.y * T.k, m = 40;
    if (T.k < POI_ZOOM) {
      fitPoints([cityPt(d.p.cityId), d].concat(poiPts.filter(o => o.p.cityId === d.p.cityId && !o.p.bateVolta)));
    } else if (sx < r.x0 + m || sx > r.x1 - m || sy < r.y0 + m || sy > r.y1 - m) {
      go(T.k, d.x, d.y, 600);
    }
    M.update();
  };

  // Volta ao zoom inicial (Europa inteira).
  M.reset = function () {
    svg.transition().duration(REDUCED ? 0 : 800).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
    M.update();
  };

  // Janela mudou de tamanho: recalcula a projeção e redesenha tudo.
  M.resize = function () {
    svg.interrupt();
    layout();
    svg.call(zoom.transform, d3.zoomIdentity);
    M.update();
    const f = A().focus;
    if (f && f.type === 'city') M.focusCity(f.id);
  };
})();
