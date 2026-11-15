/* ==========================================================================
   map.js — mapa D3 (projeção Mercator), marcadores, rotas e animações.

   Ao dar zoom, o mapa simplificado dos países dá lugar a um mapa de ruas
   (Esri World Dark Gray Canvas, sem chave de API).

   Camadas (de baixo para cima): mapa de ruas → países → hachura → rotas → bate-voltas →
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
  // Mapa de ruas: Esri "World Dark Gray Canvas" (monocromático, com nomes de ruas), sem chave de API.
  // Aparece ao dar zoom; na visão da Europa fica o mapa simplificado dos países.
  const TILE_URL = (z, x, y) => 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/' + z + '/' + y + '/' + x;
  const TILE_MAX_Z = 16;       // nível máximo disponível; acima disso as imagens são ampliadas
  const TILE_FADE = [2.5, 6];  // faixa de zoom (k) em que o mapa de ruas substitui o de países
  // Pontos que definem o enquadramento de "Ver Europa inteira": da Islândia a Chipre, da Lapônia a Malta.
  const FRAME = { type: 'MultiPoint', coordinates: [[-24.5, 34.2], [-24.5, 67.2], [35.5, 34.2], [35.5, 67.2]] };
  const VCP_LL = [-20.5, 36.8];   // Viracopos fica fora do mapa: marcador no Atlântico, a sudoeste da Europa
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const POI_ZOOM = 4;          // a partir deste zoom os pontos de interesse aparecem
  const PX_KM_MAX = 90;        // zoom máximo ao enquadrar uma cidade (px por km)
  const PX_KM_STREET = 380;    // zoom ao abrir um ponto de interesse (px por km ≈ nível de ruas)
  const TH_R = 21;             // raio (px) do círculo com foto dos pontos da cidade aberta
  const CENA_R = 15;           // raio (px) da foto das paisagens no caminho do trem

  let svg, node, root, hatch, tilesG, scaleEl, attribEl;
  let tilesCur = [], tilesZ = -1, lingering = [], lingerTimer = null;
  const L = {};
  let projection, geoPath, zoom, T = d3.zoomIdentity;
  let features = null, ready = false, routeSig = null;
  let cityPts = [], poiPts = [], infoPts = [], vcp = { id: 'vcp', x: 0, y: 0 }, pxKm = 1;
  let mover = null, drawTimer = null, cardTimer = null, lastPointer = 'mouse', pickCb = null, fotosOn = true;
  let poiSig = null, zoomRaf = 0;
  let card, tip;

  const esc = s => window.UI.esc(s);
  // ícone de casa (Material Icons "home", Apache 2.0)
  const HOUSE = 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';
  const place = sel => sel.attr('transform', d => 'translate(' + d.x + ',' + d.y + ') scale(' + (1 / T.k) + ')');

  /* ====================================================================== init */
  M.init = function () {
    svg = d3.select('#map');
    node = svg.node();
    hatch = svg.select('#hatch');
    tilesG = svg.append('g').attr('class', 'l-tiles');      // mapa de ruas (coordenadas de tela)
    root = svg.append('g').attr('class', 'zoom-layer');
    // recorte circular das fotos dos pontos
    svg.select('defs').append('clipPath').attr('id', 'thumb-clip').append('circle').attr('r', TH_R);
    svg.select('defs').append('clipPath').attr('id', 'cena-clip').append('circle').attr('r', CENA_R);
    scaleEl = document.getElementById('scale');
    attribEl = document.getElementById('attrib');
    ['countries', 'hatch', 'routes', 'trips', 'cenas', 'cities', 'pois', 'hosp', 'info', 'mover', 'fx'].forEach(n => {
      L[n] = root.append('g').attr('class', 'l-' + n);
    });
    card = document.getElementById('hovercard');
    tip = document.getElementById('tip');

    zoom = d3.zoom().scaleExtent([0.7, 30000]).on('zoom', onZoom);
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', onMapClick);
    window.addEventListener('pointerdown', e => { lastPointer = e.pointerType || 'mouse'; }, true);

    layout();
  };

  /* ======================================================= projeção e posições */
  function layout() {
    const r = A().viewRect(), mobile = A().isMobile(), pad = mobile ? 12 : 30;
    const W = window.innerWidth, H = window.innerHeight;
    // Mercator: a mesma projeção das imagens do mapa de ruas, para tudo se alinhar.
    projection = d3.geoMercator();
    projection.fitExtent([[r.x0 + pad, r.y0 + pad], [Math.max(r.x0 + pad + 50, r.x1 - pad), Math.max(r.y0 + pad + 50, r.y1 - pad)]], FRAME);
    projection.clipExtent([[-W, -H], [2 * W, 2 * H]]);
    geoPath = d3.geoPath(projection);
    zoom.translateExtent([[-W, -H], [2 * W, 2 * H]]);

    const P = o => { const p = projection([o.lon, o.lat]); return { x: p[0], y: p[1] }; };
    cityPts = D.cities.map(c => Object.assign({ id: c.id, c }, P(c)));
    poiPts = D.pois.map(p => Object.assign({ id: p.id, p }, P(p)));
    infoPts = D.info.map(i => Object.assign({ id: i.id, i }, P(i)));
    const pv = projection(VCP_LL);
    vcp = { id: 'vcp', x: pv[0], y: pv[1] };

    const a = projection([10, 50]), b = projection([10, 51]);
    pxKm = Math.hypot(a[0] - b[0], a[1] - b[1]) / 111.2;

    drawCountries();
    poiSig = null;
    drawMarkers();
    routeSig = null;
    tilesZ = -1; tilesCur = []; lingering = [];
    tilesG.selectAll('image').remove();
    mapLayers();
  }

  /* ============================================ mapa de ruas (tiles) e escala */
  // Troca suave: países (zoom afastado) ↔ mapa de ruas (zoom próximo).
  function mapLayers() {
    const f = Math.max(0, Math.min(1, (T.k - TILE_FADE[0]) / (TILE_FADE[1] - TILE_FADE[0])));
    L.countries.style('opacity', 1 - f).style('pointer-events', f > 0.5 ? 'none' : null);
    L.hatch.style('opacity', 1 - f * 0.6);
    tilesG.style('opacity', f);
    if (attribEl) attribEl.classList.toggle('on', f > 0);
    renderTiles(f > 0);
    renderScale();
  }

  function renderTiles(on) {
    if (!on) {
      if (tilesCur.length || lingering.length) { tilesG.selectAll('image').remove(); tilesCur = []; lingering = []; tilesZ = -1; }
      return;
    }
    const W = window.innerWidth, H = window.innerHeight;
    const t = projection.translate();
    const world = 2 * Math.PI * projection.scale() * T.k;         // largura do mundo em px
    const x0 = T.x + T.k * t[0] - world / 2, y0 = T.y + T.k * t[1] - world / 2;
    const z = Math.max(0, Math.min(TILE_MAX_Z, Math.round(Math.log2(world / 256))));
    const n = 1 << z, ts = world / n;

    // ao mudar de nível, as imagens antigas ficam por baixo até as novas carregarem
    if (z !== tilesZ) {
      const now = performance.now();
      lingering = lingering.filter(d => d.until > now && d.z !== z)
        .concat(tilesCur.map(d => Object.assign({}, d, { until: now + 900, old: true })));
      tilesZ = z;
      clearTimeout(lingerTimer);
      lingerTimer = setTimeout(() => { lingering = []; renderTiles(T.k > TILE_FADE[0]); }, 950);
    }

    tilesCur = [];
    const ix0 = Math.floor(-x0 / ts), ix1 = Math.floor((W - x0) / ts);
    const iy0 = Math.max(0, Math.floor(-y0 / ts)), iy1 = Math.min(n - 1, Math.floor((H - y0) / ts));
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        const wx = ((x % n) + n) % n;
        tilesCur.push({ key: z + '/' + x + '/' + y, z, x, y, url: TILE_URL(z, wx, y) });
      }
    }
    const pos = d => { const s = world / (1 << d.z); return [x0 + d.x * s, y0 + d.y * s, s]; };
    tilesG.selectAll('image').data(lingering.concat(tilesCur), d => d.key)
      .join(enter => enter.append('image').attr('preserveAspectRatio', 'none').attr('href', d => d.url))
      .each(function (d) {
        const p = pos(d);
        this.setAttribute('x', p[0]); this.setAttribute('y', p[1]);
        this.setAttribute('width', p[2] + 0.6); this.setAttribute('height', p[2] + 0.6);
      })
      .order();
  }

  // px por km (com zoom 1) numa latitude — no Mercator a escala muda com a latitude.
  function localPxKm(lat) {
    return projection.scale() * 1000 / (6371000 * Math.cos(lat * Math.PI / 180));
  }

  // Barra de escala (ex.: "500 m"), medida no centro da área visível.
  function renderScale() {
    if (!scaleEl) return;
    const r = A().viewRect();
    const ll = projection.invert([((r.x0 + r.x1) / 2 - T.x) / T.k, ((r.y0 + r.y1) / 2 - T.y) / T.k]);
    if (!ll || !isFinite(ll[1])) return;
    const pxKm = projection.scale() * T.k * 1000 / (6371000 * Math.cos(ll[1] * Math.PI / 180));
    const maxKm = 110 / pxKm, pow = Math.pow(10, Math.floor(Math.log10(maxKm)));
    const km = [5, 2, 1].map(m => m * pow).find(v => v <= maxKm) || pow;
    scaleEl.querySelector('i').style.width = (km * pxKm).toFixed(1) + 'px';
    scaleEl.querySelector('span').textContent = km >= 1 ? km.toLocaleString('pt-BR') + ' km' : Math.round(km * 1000) + ' m';
    // fotos dos pontos só com a escala abaixo de X km (a mesma barra que aparece na tela)
    const on = km < (D.config.escalaFotosKm || 5);
    if (on !== fotosOn) { fotosOn = on; if (features !== null || ready) M.update(); }
  }

  const cityPt = id => (id === 'vcp' ? vcp : cityPts.find(c => c.id === id));
  const viaPt = via => { const p = projection([via.lon, via.lat]); return { x: p[0], y: p[1] }; };

  /* ==================================================================== países */
  function drawCountries() {
    if (!features) return;
    L.countries.selectAll('path').data(features).join('path').attr('class', 'country').attr('d', geoPath)
      .on('click', (e, d) => {                     // clique no país → card de passagens aéreas
        if (pickCb) return;
        e.stopPropagation();
        hideCard();
        window.UI.showCountryCard(+d.id, (d.properties && d.properties.name) || '', e.clientX, e.clientY);
      });
    const info = new Set((D.infoAreas || [D.infoArea]).map(a => a.paisIso));
    L.hatch.selectAll('path').data(features.filter(f => info.has(+f.id))).join('path').attr('class', 'hatch').attr('d', geoPath);
    countryState();
  }

  // Países com alguma cidade selecionada ficam em cinza claro.
  function countryState() {
    const S = A().state, ativos = new Set();
    D.cities.forEach(c => {
      if (!S.cities[c.id].sel) return;
      ativos.add(c.paisIso);
      (c.paisesExtra || []).forEach(p => ativos.add(p));       // ex.: Vaticano junto com Roma
    });
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
      all.forEach(f => { if (f.id === undefined && f.properties && f.properties.name === 'Kosovo') f.id = 383; });   // o atlas não traz código para o Kosovo
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

  /* ======================================== clique no mapa / marcar hospedagem */
  function onMapClick(e) {
    if (pickCb) {
      const p = d3.pointer(e, root.node()), ll = projection.invert(p);
      const cb = pickCb;
      M.cancelPick();
      if (ll && isFinite(ll[0]) && isFinite(ll[1])) cb(ll[1], ll[0]);
      return;
    }
    hideCard();
    window.UI.hideCountryCard();
  }

  // Próximo clique no mapa devolve (lat, lon) para o callback.
  M.pick = function (cb) { pickCb = cb; node.classList.add('picking'); hideCard(); window.UI.hideCountryCard(); };
  M.cancelPick = function () { pickCb = null; node.classList.remove('picking'); };
  M.picking = () => !!pickCb;

  // Zoom até a hospedagem marcada.
  M.showHosp = function (cityId) {
    const h = A().hosp(cityId);
    if (!h) return;
    const p = projection([h.lon, h.lat]);
    go(Math.max(T.k, PX_KM_STREET / localPxKm(h.lat)), p[0], p[1], 900);
  };

  /* ================================================================ marcadores */
  const LBL = {
    e: { x: 12, y: 4, a: 'start', sx: 12, sy: 17 },
    w: { x: -12, y: 4, a: 'end', sx: -12, sy: 17 },
    n: { x: 0, y: -11, a: 'middle', sx: 0, sy: 20 },
    s: { x: 0, y: 19, a: 'middle', sx: 0, sy: 31 }
  };

  function drawMarkers() {
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
      this.__lbl = d.c.rotulo || 'e';
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

    drawPois();

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

  /* Com centenas de pontos de interesse, só entram no desenho os das cidades que estão
     na tela (e só a partir do zoom em que os pontos aparecem). Assim o mapa continua
     fluido: no zoom da Europa não existe nenhum marcador de ponto no SVG. */
  function cidadesVisiveis() {
    if (T.k < POI_ZOOM * 0.8) return [];
    const W = window.innerWidth, H = window.innerHeight, m = Math.max(260, 130 * pxKm * T.k);   // margem: bate-voltas ficam a até ~130 km
    return cityPts.filter(c => { const x = T.x + c.x * T.k, y = T.y + c.y * T.k; return x > -m && x < W + m && y > -m && y < H + m; }).map(c => c.id);
  }

  // Devolve true se o conjunto de pontos desenhados mudou.
  function drawPois() {
    const vis = cidadesVisiveis(), sig = vis.join();
    if (sig === poiSig) return false;
    poiSig = sig;
    const set = new Set(vis), lista = poiPts.filter(d => set.has(d.p.cityId));

    // bate-voltas: linhas tracejadas finas da cidade até o ponto
    L.trips.selectAll('path').data(lista.filter(d => d.p.bateVolta), d => d.id).join('path')
      .attr('class', 'trip')
      .attr('d', d => { const c = cityPt(d.p.cityId); return 'M' + c.x + ',' + c.y + 'L' + d.x + ',' + d.y; });

    const pois = L.pois.selectAll('g.poi').data(lista, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk poi');
      g.append('circle').attr('class', 'pulse').attr('r', 5);
      g.append('circle').attr('class', 'dot').attr('r', 5);
      // círculo com a foto (aparece quando a cidade do ponto está aberta)
      const t = g.append('g').attr('class', 'thumb');
      t.append('circle').attr('class', 'th-bg').attr('r', TH_R);
      t.append('text').attr('class', 'th-ini').attr('y', 4).attr('text-anchor', 'middle').text(d => window.UI.iniciais(d.p.nome));
      t.append('image').attr('x', -TH_R).attr('y', -TH_R).attr('width', 2 * TH_R).attr('height', 2 * TH_R)
        .attr('preserveAspectRatio', 'xMidYMid slice').attr('clip-path', 'url(#thumb-clip)');
      t.append('circle').attr('class', 'th-ring').attr('r', TH_R);
      g.append('text').attr('class', 'wbadge').attr('x', 6).attr('y', -5).text('!');
      // nome do ponto (só aparece no nível das ruas)
      g.append('text').attr('class', 'plbl').attr('x', 9).attr('y', 4).text(d => d.p.nome.replace(/\s*\(.*\)\s*/g, ' ').trim());
      g.append('circle').attr('class', 'hit').attr('r', 11);
      bindPoint(g, 'poi');
      return g;
    });
    place(pois);
    return true;
  }

  /* Rótulos das cidades sem sobreposição. No zoom da Europa aparecem só os nomes das
     cidades do roteiro e de algumas grandes; as demais são pontos (o nome surge no
     hover ou ao aproximar). Detecção simples de colisão entre retângulos, por
     prioridade: roteiro → cidade aberta → grandes → demais. */
  function labelLayout() {
    const App = A(), S = App.state, f = App.focus;
    const W = window.innerWidth, H = window.innerHeight, perto = T.k >= 2.3;
    const caixas = [];
    const livre = b => !caixas.some(c => c.id !== b.id && b.x0 < c.x1 && b.x1 > c.x0 && b.y0 < c.y1 && b.y1 > c.y0);
    const itens = cityPts.map(d => {
      const sel = S.cities[d.id].sel, foco = !!f && f.type === 'city' && f.id === d.id;
      return { d, sx: T.x + d.x * T.k, sy: T.y + d.y * T.k, pri: sel ? 0 : foco ? 1 : d.c.grande ? 2 : 3, sel };
    });
    // os pontos das cidades são obstáculos para os rótulos das outras
    itens.forEach(i => caixas.push({ id: i.d.id, x0: i.sx - 6, x1: i.sx + 6, y0: i.sy - 6, y1: i.sy + 6 }));
    const pos = {};
    itens.slice().sort((a, b) => a.pri - b.pri).forEach(i => {
      const fora = i.sx < -40 || i.sx > W + 40 || i.sy < -40 || i.sy > H + 40;
      if (fora || (i.pri === 3 && !perto)) { pos[i.d.id] = null; return; }
      const larg = i.d.c.nome.length * 6.7 + 6, alt = i.sel ? 28 : 15;
      const ordem = [i.d.c.rotulo || 'e', 'e', 'w', 'n', 's'].filter((v, k, a) => a.indexOf(v) === k);
      let escolhido = null;
      for (const k of ordem) {
        const o = LBL[k];
        const x0 = o.a === 'start' ? i.sx + o.x : o.a === 'end' ? i.sx + o.x - larg : i.sx - larg / 2;
        const y0 = i.sy + o.y - 11;
        const b = { id: i.d.id, x0, x1: x0 + larg, y0, y1: y0 + alt };
        if (livre(b)) { escolhido = k; caixas.push(b); break; }
      }
      if (!escolhido && i.pri === 0) escolhido = ordem[0];          // cidade do roteiro sempre mostra o nome
      pos[i.d.id] = escolhido;
    });
    L.cities.selectAll('g.city').each(function (d) {
      const k = pos[d.id], g = d3.select(this);
      g.classed('nolbl', !k).classed('menor', !S.cities[d.id].sel && !perto);
      if (!k || this.__lbl === k) return;
      this.__lbl = k;
      const o = LBL[k];
      g.select('.lbl').attr('x', o.x).attr('y', o.y).attr('text-anchor', o.a);
      g.select('.sub').attr('x', o.sx).attr('y', o.sy).attr('text-anchor', o.a);
    });
  }

  // Hover (card), clique (ripple + painel) e toque em qualquer marcador.
  function bindPoint(sel, type) {
    sel.on('pointerenter', (e, d) => { if (e.pointerType === 'mouse') showCard(type, d); })
      .on('pointerleave', e => { if (e.pointerType === 'mouse') hideCard(); })
      .on('click', (e, d) => {
        if (pickCb) return;                         // marcando hospedagem: o clique é do mapa
        e.stopPropagation();
        ripple(d);
        if (type === 'cena') { showCard(type, d); clearTimeout(cardTimer); cardTimer = setTimeout(hideCard, 4000); return; }
        if (type === 'city') A().openCity(d.id);
        else if (type === 'hosp') A().openCity(d.cityId);
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
      return { nome: p.nome, wiki: p.wiki, preco: p.preco.label + ' · ' + window.UI.dist(p).curto, status: on ? 'Selecionado' : 'Não selecionado', on, aviso: w ? w.texto : '' };
    }
    if (type === 'hosp') {
      const c = A().city(d.cityId);
      return { nome: d.h.nome || 'Minha hospedagem', wiki: '', preco: c.nome, status: 'Hospedagem', on: true };
    }
    if (type === 'cena') return { nome: d.nome, foto: d.foto, preco: 'Paisagem no caminho do trem', status: d.lado === 'dir' ? 'Janela direita' : 'Janela esquerda', on: false, aviso: d.desc };
    if (type === 'info') return { nome: d.i.nome, wiki: d.i.wiki, preco: 'Somente informativo', status: 'Não selecionável', on: false, aviso: d.i.aviso };
    return { nome: D.origem.nome, wiki: D.origem.wiki, preco: 'Aeroporto de Viracopos', status: 'Origem e destino', on: true };
  }

  function showCard(type, d) {
    const i = describe(type, d);
    clearTimeout(cardTimer);
    card.innerHTML = (i.foto ? window.UI.photoUrl(i.foto, i.nome) : i.wiki ? window.UI.photo(i.wiki, i.nome) : '') +
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
    const sel = (type === 'city' ? L.cities.selectAll('g.city') : L.pois.selectAll('g.poi')).filter(d => d.id === id).selectAll('.dot, .thumb');
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
    const k = modo === 'aviao' ? 0.2 : modo === 'balsa' ? -0.12 : -0.07;
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

    // desenha um pedaço de rota (linha + área de toque + selo do meio de transporte)
    const addPath = (leg, modo, active, d, mid, real) => {
        const geo = { d, mid };
        const p = (active ? gAct : gAlt).append('path').attr('class', 'route ' + (active ? 'active ' : 'alt ') + modo + (real ? ' real' : '')).attr('d', geo.d);
        if (!geo.mid) { const el = p.node(), pt = el.getPointAtLength(el.getTotalLength() / 2); geo.mid = { x: pt.x, y: pt.y }; }
        gHit.append('path').attr('class', 'route-hit').attr('d', geo.d)
          .on('pointerenter pointermove', e => { p.classed('hover', true); showTip(e, leg, modo, active); })
          .on('pointerleave', () => { p.classed('hover', false); hideTip(); })
          .on('click', e => { if (pickCb) return; e.stopPropagation(); showTip(e, leg, modo, active); if (lastPointer !== 'mouse') setTimeout(() => { p.classed('hover', false); hideTip(); }, 2600); });
        if (active) {
          segs.push({ el: p.node(), modo });
          const b = gMk.append('g').attr('class', 'mk badge').datum(geo.mid);
          b.append('circle').attr('r', 9);
          b.append('path').attr('d', window.ICONS[modo]).attr('transform', 'translate(-6,-6) scale(0.5)');
          place(b);
        }
    };

    const legPaths = (leg, modo, active) => {
      const o = leg.opts[modo];
      // trem: segue o traçado real da ferrovia quando ele já está no cache (senão, arco)
      const real = modo === 'trem' ? window.Trilhos.geometria(leg, modo) : null;
      if (real) {
        const a = cityPt(leg.from), b = cityPt(leg.to);
        const d = 'M' + a.x + ',' + a.y + real.map(c => { const p = projection(c); return 'L' + p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join('') + 'L' + b.x + ',' + b.y;
        addPath(leg, modo, active, d, null, true);
      } else {
        const pts = [cityPt(leg.from)];
        o.vias.forEach(v => pts.push(viaPt(v)));
        pts.push(cityPt(leg.to));
        for (let i = 0; i < pts.length - 1; i++) { const geo = arc(pts[i], pts[i + 1], modo); addPath(leg, modo, active, geo.d, geo.mid, false); }
      }
      if (active) o.vias.forEach(v => {            // paradas intermediárias (ex.: Berlim, Milão, Paris)
        const s = gMk.append('g').attr('class', 'mk stop').datum(viaPt(v));
        s.append('circle').attr('r', v.cityId ? 9 : 4);
        if (!v.cityId) s.append('text').attr('x', 8).attr('y', 4).text(v.nome + ' (parada)');
        place(s);
      });
    };

    legs.forEach(leg => {                          // alternativa (modo não escolhido) por baixo
      const outro = leg.modo === 'aviao' ? leg.terra : 'aviao';     // avião × melhor opção por terra
      if (outro && leg.opts[outro]) legPaths(leg, outro, false);
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
      const e = Math.max(0, now - t0) / per, i =Math.floor(e) % segs.length, f = e - Math.floor(e);
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

  // Ponto vira círculo com foto se a cidade dele está aberta e o zoom está próximo
  // (escala do mapa abaixo de DATA.config.escalaFotosKm); afastando, volta a ser pontinho.
  function fotoNoMapa(d, aberta) {
    return fotosOn && d.p.cityId === aberta;
  }

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

    // cidade aberta no painel: seus pontos viram círculos com foto
    const f = App.focus;
    const aberta = !f ? null : f.type === 'city' ? f.id : f.type === 'poi' ? App.poi(f.id).cityId : null;

    drawPois();
    labelLayout();
    const pois = L.pois.selectAll('g.poi')
      .classed('sel', d => App.poiActive(d.id))
      .classed('off', d => !!tag && d.p.tags.indexOf(tag) < 0)
      .classed('focus', d => !!f && f.type === 'poi' && f.id === d.id)
      .classed('big', d => fotoNoMapa(d, aberta))
      .each(function (d) {
        const g = d3.select(this), w = App.poiWarn(d.p), big = fotoNoMapa(d, aberta);
        g.classed('warn', !!w).classed('warn-forte', !!w && w.nivel === 'forte');
        // posições do aviso "!", do nome e do pulso conforme o tamanho do marcador
        g.select('.wbadge').attr('x', big ? TH_R - 4 : 6).attr('y', big ? -TH_R + 4 : -5);
        g.select('.plbl').attr('x', big ? 0 : 9).attr('y', big ? TH_R + 13 : 4).attr('text-anchor', big ? 'middle' : 'start');
        g.select('.pulse').attr('r', big ? TH_R : 5);
        g.select('.hit').attr('r', big ? TH_R + 2 : 11);
        if (big && !this.__foto) {                  // carrega a foto só quando for exibida
          this.__foto = true;
          window.Photos.get(d.p.wiki).then(src => {
            if (src) { g.select('image').attr('href', src); g.classed('has-img', true); }
            else this.__foto = false;
          });
        }
      });
    // ordem de desenho: pontos da cidade aberta por cima; selecionados por cima dos demais
    pois.filter(d => App.poiActive(d.id)).raise();
    pois.filter(d => fotoNoMapa(d, aberta) && !App.poiActive(d.id)).raise();
    pois.filter(d => fotoNoMapa(d, aberta) && App.poiActive(d.id)).raise();

    L.trips.selectAll('path')
      .classed('sel', d => App.poiActive(d.id))
      .classed('off', d => !!tag && d.p.tags.indexOf(tag) < 0);

    // minha hospedagem (ícone de casa) nas cidades do roteiro
    const hs = calc.route.map(id => ({ id, h: App.hosp(id) })).filter(o => o.h).map(o => {
      const p = projection([o.h.lon, o.h.lat]);
      return { id: 'hosp-' + o.id, cityId: o.id, h: o.h, x: p[0], y: p[1] };
    });
    const hg = L.hosp.selectAll('g.hosp').data(hs, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk hosp');
      g.append('circle').attr('class', 'dot').attr('r', 10);
      g.append('path').attr('d', HOUSE).attr('transform', 'translate(-7.2,-7.6) scale(0.6)');
      g.append('circle').attr('class', 'hit').attr('r', 14);
      bindPoint(g, 'hosp');
      return g;
    });
    place(hg);

    // paisagens no caminho dos trens: pontinhos ao longo da linha; com a escala abaixo de
    // escalaFotosKm viram círculos com foto (a mesma regra dos pontos de interesse)
    const cs = window.Trilhos.cenasDaRota().map(c => { const p = projection([c.lon, c.lat]); return Object.assign({ x: p[0], y: p[1] }, c); });
    const cg = L.cenas.selectAll('g.cena').data(cs, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'mk cena');
      g.append('circle').attr('class', 'dot').attr('r', 3);
      const t = g.append('g').attr('class', 'thumb');
      t.append('circle').attr('class', 'th-bg').attr('r', CENA_R);
      t.append('image').attr('x', -CENA_R).attr('y', -CENA_R).attr('width', 2 * CENA_R).attr('height', 2 * CENA_R)
        .attr('preserveAspectRatio', 'xMidYMid slice').attr('clip-path', 'url(#cena-clip)');
      t.append('circle').attr('class', 'th-ring').attr('r', CENA_R);
      g.append('circle').attr('class', 'hit').attr('r', 10);
      bindPoint(g, 'cena');
      return g;
    });
    cg.classed('big', fotosOn).each(function (d) {
      if (fotosOn && !this.__foto) { this.__foto = true; d3.select(this).select('image').attr('href', d.foto); }
      d3.select(this).select('.hit').attr('r', fotosOn ? CENA_R + 2 : 10);
    });
    place(cg);

    countryState();

    if (ready) {
      const sig = calc.legs.map(l => l.key + ':' + l.modo).join('|');
      if (sig !== routeSig) { routeSig = sig; drawRoutes(true); }
    }
  };

  // Redesenha as rotas sem repetir a animação (ex.: chegou o traçado real de um trem).
  M.refreshRoutes = function () {
    if (!ready || !A().calc) return;
    routeSig = A().calc.legs.map(l => l.key + ':' + l.modo).join('|');
    drawRoutes(false);
  };

  /* ====================================================================== zoom */
  function onZoom(e) {
    T = e.transform;
    root.attr('transform', T);
    node.style.setProperty('--k', T.k);
    hatch.attr('patternTransform', 'rotate(45) scale(' + (1 / T.k) + ')');
    mapLayers();
    place(root.selectAll('.mk'));
    node.classList.toggle('lvl-city', T.k >= POI_ZOOM);
    node.classList.toggle('lvl-street', T.k * pxKm >= 140);    // nomes dos pontos a partir de ~140 px/km
    document.body.classList.toggle('zoomed', T.k > 1.03 || Math.abs(T.x) > 3 || Math.abs(T.y) > 3);
    node.classList.toggle('lvl-europa', T.k < 2.3);
    hideCard();
    hideTip();
    if (e.sourceEvent) window.UI.hideCountryCard();   // arrastar/rolar o mapa fecha o card do país
    // rótulos e pontos visíveis: no máximo uma vez por quadro
    if (!zoomRaf) zoomRaf = requestAnimationFrame(() => {
      zoomRaf = 0;
      if (!A().calc) return;
      if (drawPois()) M.update(); else labelLayout();
    });
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
    // aproxima até o nível das ruas (~1,5 km de largura visível), centralizado no ponto
    const kRua = PX_KM_STREET / localPxKm(d.p.lat);
    go(Math.max(T.k, kRua), d.x, d.y, 900);
    M.update();
  };

  // Enquadra o roteiro atual (cidades selecionadas + Viracopos). Sem roteiro, mostra a Europa inteira.
  M.fitRoute = function (semAnimar) {
    const ids = A().calc.route;
    if (!ids.length) { M.reset(); return; }
    const r = A().viewRect(), pad = A().isMobile() ? 30 : 80, pts = ids.map(cityPt).concat([vcp]);
    const x0 = d3.min(pts, d => d.x), x1 = d3.max(pts, d => d.x), y0 = d3.min(pts, d => d.y), y1 = d3.max(pts, d => d.y);
    const k = Math.max(1, Math.min(6, (r.x1 - r.x0 - 2 * pad) / Math.max(x1 - x0, 1), (r.y1 - r.y0 - 2 * pad) / Math.max(y1 - y0, 1)));
    const t = d3.zoomIdentity.translate((r.x0 + r.x1) / 2 - k * (x0 + x1) / 2, (r.y0 + r.y1) / 2 - k * (y0 + y1) / 2).scale(k);
    if (semAnimar || REDUCED) svg.call(zoom.transform, t);
    else svg.transition().duration(800).ease(d3.easeCubicInOut).call(zoom.transform, t);
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
    if (f && f.type === 'city') M.focusCity(f.id); else M.fitRoute(true);
  };
})();
