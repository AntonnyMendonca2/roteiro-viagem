/* ==========================================================================
   ape.js — Feature 3: trajetos reais a pé (OSRM com perfil de pedestres).

   Servidor: routing.openstreetmap.de/routed-foot (comunitário, sem chave).
   O trecho "driving" aparece na URL, mas o servidor é o de pedestres.
   Regras de educação: no máximo 1 requisição por segundo (fila "ape" do
   net.js), cache longo (as coordenadas não mudam) e nada de laços.

   - matriz da cidade: tempos e distâncias entre a hospedagem (ou o centro) e
     os pontos de interesse — usada no painel do ponto e no dia a dia;
   - rota com o desenho do caminho: "Como chegar a pé" e o trajeto de cada dia;
   - sem internet ou com erro: volta à estimativa (linha reta × 1,3 a 4,8 km/h).
   ========================================================================== */
(function () {
  'use strict';

  const Net = window.Net;
  const A = () => window.App;
  const Ape = window.Ape = {};
  const BASE = 'https://routing.openstreetmap.de/routed-foot/';
  const TTL = 180 * Net.DIA;
  const MAX_PTS = 50;            // limite prático de pontos por chamada da matriz
  const RAIO_KM = 25;            // pontos além disso (bate-voltas) ficam fora da matriz
  Ape.LONGE_KM = 3;              // acima disso, sugere transporte público
  Ape.FATOR = 1.3;               // desvio médio das ruas sobre a linha reta
  Ape.KMH = 4.8;                 // velocidade a pé

  /* ============================================================ funções puras */
  // Estimativa sem internet: linha reta × 1,3 a 4,8 km/h.
  Ape.estimar = function (a, b) {
    const km = A().distKm(a, b) * Ape.FATOR;
    return { km, min: km / Ape.KMH * 60, real: false };
  };

  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const coord = p => p.lon.toFixed(5) + ',' + p.lat.toFixed(5);

  Ape.fmtKm = km => (km < 1 ? Math.max(50, Math.round(km * 20) * 50) + ' m' : (km < 10 ? Math.round(km * 10) / 10 : Math.round(km)).toLocaleString('pt-BR') + ' km');
  Ape.fmtMin = min => (min < 60 ? Math.max(1, Math.round(min)) + ' min' : window.Fmt.horas(min / 60));

  /* ================================================================== matriz */
  // Origem dos trajetos na cidade: a hospedagem marcada ou o centro.
  Ape.origem = function (cityId) {
    const App = A(), h = App.hosp(cityId), c = App.city(cityId);
    return h ? { id: '_o', lat: h.lat, lon: h.lon, hosp: true } : { id: '_o', lat: c.lat, lon: c.lon, hosp: false };
  };

  // Pontos que entram na matriz: origem + pontos de interesse próximos (os mais perto primeiro).
  function pontosDa(cityId) {
    const App = A(), o = Ape.origem(cityId);
    const ps = App.poisOf(cityId).map(p => ({ id: p.id, lat: p.lat, lon: p.lon, d: App.distKm(o, p) }))
      .filter(p => p.d <= RAIO_KM).sort((a, b) => a.d - b.d).slice(0, MAX_PTS - 1);
    return [o].concat(ps);
  }

  const chaveDe = (cityId, pts) => 'ape:m:' + cityId + ':' + hash(pts.map(p => p.id + '@' + coord(p)).join(';'));
  const memo = {};          // chave → { ids, idx, dur, dist }
  const pedindo = {};

  function indexar(m) { m.idx = {}; m.ids.forEach((id, i) => { m.idx[id] = i; }); return m; }

  // Matriz da cidade, se já estiver no cache (síncrono). null = ainda não buscada.
  Ape.matrizDe = function (cityId) {
    const pts = pontosDa(cityId), k = chaveDe(cityId, pts);
    if (memo[k]) return memo[k];
    const v = Net.peek(k);
    return v ? (memo[k] = indexar(v)) : null;
  };

  // Busca a matriz da cidade (uma chamada). Redesenha o painel quando chegar.
  Ape.carregar = function (cityId) {
    const pts = pontosDa(cityId), k = chaveDe(cityId, pts);
    if (pts.length < 2 || Net.peek(k)) return Promise.resolve(Ape.matrizDe(cityId));
    if (pedindo[k]) return pedindo[k];
    const url = BASE + 'table/v1/driving/' + pts.map(coord).join(';') + '?annotations=duration,distance';
    pedindo[k] = Net.getJSON(url, { fila: 'ape', ttl: TTL, chave: k, timeout: 30000, reduzir: j => {
      if (!j || j.code !== 'Ok' || !j.durations) throw new Error('matriz');
      // segundos → décimos de minuto · metros inteiros (a matriz fica pequena no cache)
      return { ids: pts.map(p => p.id), dur: j.durations.map(l => l.map(v => (v == null ? null : Math.round(v / 6)))),
        dist: (j.distances || []).map(l => l.map(v => (v == null ? null : Math.round(v)))) };
    } }).then(r => { memo[k] = indexar(r.data); avisar(); return memo[k]; })
      .catch(() => null)
      .finally(() => { setTimeout(() => { delete pedindo[k]; }, 60000); });   // em caso de erro, só tenta de novo depois de 1 min
    return pedindo[k];
  };

  // Tempo e distância a pé entre dois itens da cidade ('_o' = origem, ou id de ponto).
  // Usa a matriz real quando existe; senão, a estimativa em linha reta.
  Ape.entre = function (cityId, aId, bId) {
    const m = Ape.matrizDe(cityId);
    if (m && aId in m.idx && bId in m.idx) {
      const d = m.dur[m.idx[aId]][m.idx[bId]], x = m.dist[m.idx[aId]] ? m.dist[m.idx[aId]][m.idx[bId]] : null;
      if (d != null) return { min: d / 10, km: x != null ? x / 1000 : d / 10 / 60 * Ape.KMH, real: true };
    }
    const App = A(), pt = id => (id === '_o' ? Ape.origem(cityId) : App.poi(id));
    const a = pt(aId), b = pt(bId);
    return a && b ? Ape.estimar(a, b) : { km: 0, min: 0, real: false };
  };

  // Da origem (hospedagem ou centro) até um ponto.
  Ape.ate = p => Ape.entre(p.cityId, '_o', p.id);

  /* ====================================================== rota com o desenho */
  // Caminho a pé passando pelos pontos dados ([{lat, lon}, ...]).
  // Devolve { c: [[lon, lat], ...], km, min } ou null (erro / sem internet).
  Ape.rota = function (pts) {
    if (pts.length < 2) return Promise.resolve(null);
    const s = pts.map(coord).join(';'), k = 'ape:r:' + hash(s);
    const url = BASE + 'route/v1/driving/' + s + '?overview=full&geometries=geojson';
    return Net.getJSON(url, { fila: 'ape', ttl: TTL, chave: k, timeout: 30000, reduzir: j => {
      const r = j && j.code === 'Ok' && j.routes && j.routes[0];
      if (!r) throw new Error('rota');
      let c = r.geometry.coordinates;
      if (c.length > 400 && window.Trilhos) c = window.Trilhos.simplificar(c, 400);
      return { c: c.map(x => [Math.round(x[0] * 1e5) / 1e5, Math.round(x[1] * 1e5) / 1e5]), km: r.distance / 1000, min: r.duration / 60 };
    } }).then(r => r.data).catch(() => null);
  };
  Ape.rotaNoCache = pts => Net.peek('ape:r:' + hash(pts.map(coord).join(';')));

  /* ================================================================ interface */
  let timer = null;
  function avisar() {
    clearTimeout(timer);
    timer = setTimeout(() => { const App = A(); if (App.calc && App.focus) { window.UI.renderAll(); window.MapView.update(); } }, 150);
  }

  const esc = s => window.UI.esc(s);

  // Texto de distância do ponto: real (pelas ruas) ou estimativa.
  Ape.texto = function (p) {
    const App = A(), c = App.city(p.cityId), o = Ape.origem(p.cityId), r = Ape.ate(p), reta = App.distKm(o, p);
    const de = o.hosp ? 'da sua hospedagem' : 'do centro de ' + c.nome;
    if (reta > RAIO_KM) return { r, curto: '~' + Ape.fmtKm(reta), longo: '~' + Ape.fmtKm(reta) + ' ' + de + ' (em linha reta)', longe: true };
    const pre = r.real ? '' : '~';
    return { r, curto: pre + Ape.fmtKm(r.km), longe: r.km > Ape.LONGE_KM,
      longo: pre + Ape.fmtKm(r.km) + ' ' + de + ' · ' + pre + Ape.fmtMin(r.min) + ' a pé' + (r.real ? ' pelas ruas' : ' (estimativa)') };
  };

  // Bloco de distância do painel do ponto.
  Ape.poiHtml = function (p) {
    const t = Ape.texto(p), ll = p.lat + ',' + p.lon;
    let html = '<p class="dist">' + esc(t.longo) + '</p>';
    if (t.longe) {
      html += '<p class="dist-tip">' + (t.r.km > RAIO_KM || !isFinite(t.r.km) ? 'Fica longe para ir a pé' : 'Mais de ' + Ape.LONGE_KM + ' km a pé') + ' — vale usar o transporte público: ' +
        '<a class="lnk" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + ll + '&amp;travelmode=transit" target="_blank" rel="noopener noreferrer">ver como chegar no Google Maps ↗</a></p>';
    }
    if (A().distKm(Ape.origem(p.cityId), p) <= 8) {
      const on = Ape.ativa === p.id;
      html += '<button type="button" class="btn sm' + (on ? ' on' : '') + '" data-act="walk" data-id="' + esc(p.id) + '" data-fid="walk-' + esc(p.id) + '">' +
        (on ? 'Ocultar o caminho a pé' : 'Como chegar a pé') + '</button>';
    }
    return html;
  };

  Ape.ativa = null;         // id do ponto com o caminho desenhado
  Ape.limpar = function () {
    if (!Ape.ativa) return;
    Ape.ativa = null;
    window.MapView.showWalk(null);
  };

  Ape.bind = function () {
    const UI = window.UI;
    UI.actions.walk = (t, id) => {
      const App = A(), p = App.poi(id);
      if (!p) return;
      if (Ape.ativa === id) { Ape.limpar(); UI.renderAll(); return; }
      UI.toast('Buscando o caminho a pé…');
      Ape.rota([Ape.origem(p.cityId), p]).then(r => {
        if (!r) { UI.toast('Não foi possível traçar o caminho agora (sem internet?). A distância mostrada é uma estimativa.', 5000); return; }
        Ape.ativa = id;
        window.MapView.showWalk(r.c, true);
        UI.toast('Caminho a pé: ' + Ape.fmtKm(r.km) + ' · ' + Ape.fmtMin(r.min) + '.');
        UI.renderAll();
      });
    };
  };
})();
