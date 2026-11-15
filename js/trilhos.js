/* ==========================================================================
   trilhos.js — Feature 12: rota real dos trens, horários reais e paisagens.

   - Traçado da ferrovia: OpenRailRouting (sem chave). Uma requisição por vez,
     linha simplificada (Douglas-Peucker) e cache de 1 ano — o traçado não muda.
     Se a API falhar, o mapa continua com o arco.
   - Horários reais: Transitous (sem chave). Para datas ainda sem horário
     publicado, consulta o mesmo dia da semana numa data próxima ("referência").
   - Paisagens no caminho: amostra pontos ao longo do traçado, busca lugares na
     Wikipedia (wiki.js), escolhe os mais bonitos/populares, bem distribuídos,
     e calcula o lado da janela e o horário aproximado de passagem.
   Só os trechos de TREM ganham traçado real; avião, ônibus e balsa seguem em arco.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA, Net = window.Net, Wiki = window.Wiki;
  const A = () => window.App;
  const Trilhos = window.Trilhos = {};
  const ORR = 'https://routing.openrailrouting.org/route';
  const TRANSITOUS = 'https://api.transitous.org/api/v1/plan';
  const TTL_TRILHO = 365 * Net.DIA, TTL_CENAS = 60 * Net.DIA, TTL_HORARIO = Net.DIA;
  const MAX_PTS = 260;

  /* ============================================================ funções puras */
  const RAD = Math.PI / 180;
  function distKm(a, b) {           // a, b = [lon, lat]
    const dLat = (b[1] - a[1]) * RAD, dLon = (b[0] - a[0]) * RAD;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(x));
  }

  // Douglas-Peucker (iterativo). tol em graus; a longitude é corrigida pela latitude.
  function dp(coords, tol) {
    const n = coords.length;
    if (n <= 2) return coords.slice();
    const k = Math.cos(coords[0][1] * RAD), manter = new Uint8Array(n), pilha = [[0, n - 1]];
    manter[0] = manter[n - 1] = 1;
    while (pilha.length) {
      const [a, b] = pilha.pop();
      const ax = coords[a][0] * k, ay = coords[a][1], bx = coords[b][0] * k, by = coords[b][1];
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      let pior = -1, max = 0;
      for (let i = a + 1; i < b; i++) {
        const px = coords[i][0] * k - ax, py = coords[i][1] - ay;
        let t = len2 ? (px * dx + py * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const ex = px - t * dx, ey = py - t * dy, d = ex * ex + ey * ey;
        if (d > max) { max = d; pior = i; }
      }
      if (pior >= 0 && Math.sqrt(max) > tol) { manter[pior] = 1; pilha.push([a, pior], [pior, b]); }
    }
    return coords.filter((_, i) => manter[i]);
  }

  // Simplifica até caber em "max" pontos (dobra a tolerância até caber).
  Trilhos.simplificar = function (coords, max) {
    let tol = 0.0015, out = dp(coords, tol);
    while (out.length > (max || MAX_PTS) && tol < 0.2) { tol *= 1.6; out = dp(coords, tol); }
    return out.map(c => [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4]);
  };

  // Distância acumulada (km) em cada ponto da linha.
  Trilhos.acumulado = function (coords) {
    const out = [0];
    for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + distKm(coords[i - 1], coords[i]));
    return out;
  };

  // Ponto da linha a "km" do início.
  function pontoEm(coords, acc, km) {
    let i = 1;
    while (i < acc.length - 1 && acc[i] < km) i++;
    const seg = acc[i] - acc[i - 1], t = seg ? Math.max(0, Math.min(1, (km - acc[i - 1]) / seg)) : 0;
    return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
  }

  // Pontos de amostra ao longo da linha, a cada "passo" km (começando em meio passo).
  Trilhos.amostrar = function (coords, passoKm) {
    const acc = Trilhos.acumulado(coords), total = acc[acc.length - 1], out = [];
    for (let km = passoKm / 2; km < total; km += passoKm) { const p = pontoEm(coords, acc, km); out.push({ lon: p[0], lat: p[1], km }); }
    return out;
  };

  // Posição de um lugar em relação à linha: lado da janela (no sentido da linha),
  // km percorridos até o ponto mais próximo e distância até os trilhos.
  Trilhos.lado = function (coords, lugar, acc) {
    acc = acc || Trilhos.acumulado(coords);
    const k = Math.cos(lugar.lat * RAD), px = lugar.lon * k, py = lugar.lat;
    let melhor = Infinity, res = null;
    for (let i = 1; i < coords.length; i++) {
      const ax = coords[i - 1][0] * k, ay = coords[i - 1][1], dx = coords[i][0] * k - ax, dy = coords[i][1] - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const ex = px - (ax + t * dx), ey = py - (ay + t * dy), d = ex * ex + ey * ey;
      if (d < melhor) {
        melhor = d;
        // produto vetorial (sentido da viagem × vetor até o lugar): positivo = à esquerda
        const cruz = dx * (py - ay) - dy * (px - ax);
        res = { lado: cruz > 0 ? 'esq' : 'dir', km: acc[i - 1] + (acc[i] - acc[i - 1]) * t, distKm: Math.sqrt(d) * 111.2 };
      }
    }
    return res;
  };

  // Escolhe de 3 a 8 paisagens bem distribuídas: divide o percurso em faixas e pega a
  // melhor de cada uma (nota = "cênico" × popularidade). candidatos: { km, cenico, views, ... }
  Trilhos.escolher = function (cands, totalKm) {
    const n = Math.max(3, Math.min(8, Math.round(totalKm / 70)));
    const nota = c => (c.cenico || 0) * Math.log10((c.views || 0) + 10);
    const faixas = [];
    cands.forEach(c => {
      const f = Math.min(n - 1, Math.floor(c.km / totalKm * n));
      if (!faixas[f] || nota(c) > nota(faixas[f])) faixas[f] = c;
    });
    let out = faixas.filter(Boolean);
    if (out.length < 3) {            // poucas faixas com candidato: completa com os melhores restantes
      const resto = cands.filter(c => out.indexOf(c) < 0).sort((a, b) => nota(b) - nota(a));
      out = out.concat(resto.slice(0, 3 - out.length));
    }
    return out.sort((a, b) => a.km - b.km);
  };

  // Sugestão de lado: "Sente do lado direito: 5 das 7 paisagens ficam à direita".
  Trilhos.sugestao = function (lista) {
    const dir = lista.filter(c => c.lado === 'dir').length, esq = lista.length - dir;
    if (lista.length < 2 || dir === esq) return '';
    const m = Math.max(dir, esq);
    return 'Sente do lado ' + (dir > esq ? 'direito' : 'esquerdo') + ': ' + m + ' das ' + lista.length + ' paisagens ficam à ' + (dir > esq ? 'direita' : 'esquerda') + '.';
  };

  // Data usada na consulta de horários: a própria data se estiver perto; senão o mesmo
  // dia da semana na primeira semana a partir de hoje + 7 dias ("horário de referência").
  Trilhos.dataConsulta = function (data, hoje) {
    const dias = Math.round((data.getTime() - hoje.getTime()) / 86400000);
    if (dias >= 0 && dias <= 45) return { data, referencia: false };
    let d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + 7, 12));
    while (d.getUTCDay() !== data.getUTCDay()) d = new Date(d.getTime() + 86400000);
    return { data: d, referencia: true };
  };

  /* ============================================================ traçado real */
  // Paradas do trecho de trem: estação de origem, paradas intermediárias, estação de destino.
  function paradas(leg, modo) {
    if (leg.intl || modo !== 'trem' || !leg.opts.trem) return null;
    const App = A(), a = App.city(leg.from), b = App.city(leg.to);
    if (!a.estacao || !b.estacao) return null;
    const pts = [[a.estacao.lon, a.estacao.lat]];
    leg.opts.trem.vias.forEach(v => {
      const c = v.cityId ? App.city(v.cityId) : null;
      if (c && c.estacao) pts.push([c.estacao.lon, c.estacao.lat]); else if (v.lat != null) pts.push([v.lon, v.lat]);
    });
    pts.push([b.estacao.lon, b.estacao.lat]);
    return pts;
  }

  // Chave do cache, sempre no mesmo sentido (para A→B e B→A usarem a mesma linha).
  function chave(pts) {
    const s = pts.map(p => p[1].toFixed(3) + ',' + p[0].toFixed(3));
    const inv = s[0] > s[s.length - 1];
    return { k: (inv ? s.slice().reverse() : s).join(';'), inv };
  }

  // Traçado no sentido da viagem ([[lon, lat], ...]) se já estiver no cache; senão null.
  Trilhos.geometria = function (leg, modo) {
    const pts = paradas(leg, modo);
    if (!pts) return null;
    const c = chave(pts), g = Net.peek('trilho:' + c.k);
    if (!g || !g.c) return null;
    return c.inv ? g.c.slice().reverse() : g.c;
  };

  const pedindo = {}, falhou = {};
  // Busca o traçado (se ainda não estiver no cache) e redesenha as rotas quando chegar.
  Trilhos.pedir = function (leg, modo) {
    const pts = paradas(leg, modo);
    if (!pts) return Promise.resolve(null);
    const c = chave(pts), ck = 'trilho:' + c.k;
    if (Net.peek(ck)) return Promise.resolve(Net.peek(ck));
    if (pedindo[ck]) return pedindo[ck];
    if (falhou[ck] && Date.now() - falhou[ck] < 10 * 60000) return Promise.resolve(null);   // falhou há pouco: não insiste
    const ordem = c.inv ? pts.slice().reverse() : pts;
    const url = ORR + '?' + ordem.map(p => 'point=' + p[1] + ',' + p[0]).join('&') + '&profile=all_tracks&points_encoded=false';
    pedindo[ck] = Net.getJSON(url, { fila: 'trilhos', ttl: TTL_TRILHO, chave: ck, timeout: 45000, reduzir: j => {
      const p = j && j.paths && j.paths[0];
      if (!p || !p.points || !p.points.coordinates || p.points.coordinates.length < 2) throw new Error('sem rota');
      return { c: Trilhos.simplificar(p.points.coordinates.map(x => [x[0], x[1]]), MAX_PTS), km: Math.round(p.distance / 1000) };
    } }).then(r => {
      if (window.MapView && window.MapView.refreshRoutes) window.MapView.refreshRoutes();
      avisar();
      return r.data;
    }).catch(() => { falhou[ck] = Date.now(); return null; })
      .finally(() => { delete pedindo[ck]; });
    return pedindo[ck];
  };

  // Distância real do traçado (km), se conhecida.
  Trilhos.km = function (leg) {
    const pts = paradas(leg, 'trem');
    if (!pts) return null;
    const g = Net.peek('trilho:' + chave(pts).k);
    return g ? g.km : null;
  };

  // Pré-carrega o traçado de todos os trechos de trem da tabela (aba Dados).
  Trilhos.preCarregar = function () {
    const App = A(), UI = window.UI;
    const legs = D.legs.filter(l => l.trem).map(l => ({ from: l.a, to: l.b, intl: false,
      opts: { trem: { vias: (l.trem.via ? [l.trem.via] : []).map(v => (v.cityId ? Object.assign({ cityId: v.cityId }, App.city(v.cityId)) : v)) } } }));
    let feitos = 0, ok = 0;
    UI.toast('Pré-carregando ' + legs.length + ' rotas de trem (uma por segundo)…', 6000);
    return legs.reduce((p, leg) => p.then(() => Trilhos.pedir(leg, 'trem')).then(r => {
      feitos++; if (r) ok++;
      if (feitos % 10 === 0) UI.toast('Rotas de trem: ' + feitos + ' de ' + legs.length + '…', 4000);
    }), Promise.resolve()).then(() => UI.toast(ok + ' de ' + legs.length + ' rotas de trem guardadas no navegador.', 5000));
  };

  /* ====================================================== paisagens no caminho */
  const cenasMem = {}, cenasPedindo = {};

  // Paisagens de um trecho, já no sentido da viagem (lado e km corrigidos). null = ainda não buscadas.
  Trilhos.cenas = function (leg) {
    const pts = paradas(leg, 'trem');
    if (!pts) return null;
    const c = chave(pts), g = Net.peek('trilho:' + c.k);
    const lista = cenasMem[c.k] || Net.peek('cenas:' + c.k);
    if (!lista || !g) return null;
    cenasMem[c.k] = lista;
    const total = Trilhos.acumulado(g.c).pop();
    const out = lista.map(x => Object.assign({}, x, c.inv ? { km: Math.round(total - x.km), lado: x.lado === 'esq' ? 'dir' : 'esq' } : null));
    return { lista: out.sort((a, b) => a.km - b.km), total };
  };

  // Busca as paisagens de um trecho (precisa do traçado). Resultado em cache por 60 dias.
  Trilhos.buscarCenas = function (leg) {
    const pts = paradas(leg, 'trem');
    if (!pts) return Promise.resolve(null);
    const c = chave(pts), ck = 'cenas:' + c.k, g = Net.peek('trilho:' + c.k);
    if (!g) return Promise.resolve(null);
    if (Net.peek(ck, TTL_CENAS)) return Promise.resolve(Net.peek(ck));
    if (cenasPedindo[ck]) return cenasPedindo[ck];
    const coords = g.c, acc = Trilhos.acumulado(coords), total = acc[acc.length - 1];
    const App = A(), pontas = [App.city(leg.from), App.city(leg.to)];
    const amostras = Trilhos.amostrar(coords, Math.max(28, total / 16));

    cenasPedindo[ck] = Promise.all(amostras.map(s => Wiki.geosearch(s.lat, s.lon, 10000, 30, 'fundo').catch(() => [])))
      .then(listas => {
        const vistos = {}, cands = [];
        listas.forEach(l => l.forEach(i => {
          if (vistos[i.titulo]) return;
          vistos[i.titulo] = true;
          if (!i.foto || !Wiki.ehLugar(i)) return;
          const cen = Wiki.cenico(i);
          if (cen < 1) return;
          // nada de pontos turísticos das próprias cidades de partida e chegada
          if (pontas.some(p => App.distKm(p, i) < 18)) return;
          const pos = Trilhos.lado(coords, i, acc);
          if (!pos || pos.distKm > 8) return;
          cands.push(Object.assign({}, i, { cenico: cen, km: pos.km, lado: pos.lado, dist: Math.round(pos.distKm * 10) / 10 }));
        }));
        // popularidade só dos melhores candidatos (os mais "cênicos" de cada trecho do caminho)
        cands.sort((a, b) => b.cenico - a.cenico);
        return Wiki.comAcessos(cands.slice(0, 18), 'fundo');
      })
      .then(cands => {
        const lista = Trilhos.escolher(cands, total).map(x => ({ titulo: x.titulo, nome: x.nome, desc: x.desc, foto: x.foto,
          lat: x.lat, lon: x.lon, km: Math.round(x.km), lado: x.lado, views: x.views }));
        Net.cacheSet(ck, lista);
        cenasMem[c.k] = lista;
        if (window.MapView) window.MapView.update();
        avisar();
        return lista;
      })
      .catch(() => null)
      .finally(() => { delete cenasPedindo[ck]; });
    return cenasPedindo[ck];
  };

  // Paisagens de todos os trechos de trem ativos do roteiro (para o mapa).
  Trilhos.cenasDaRota = function () {
    const out = [];
    A().calc.legs.forEach(leg => {
      if (leg.modo !== 'trem') return;
      const c = Trilhos.cenas(leg);
      if (c) c.lista.forEach(x => out.push(Object.assign({ id: 'cena:' + leg.key + ':' + x.titulo, legKey: leg.key }, x)));
    });
    return out;
  };

  // Chamado a cada atualização: pede traçado e paisagens dos trechos de trem ativos (só o que falta).
  Trilhos.carregar = function () {
    A().calc.legs.forEach(leg => {
      if (leg.modo !== 'trem' || !paradas(leg, 'trem')) return;
      Trilhos.pedir(leg, 'trem').then(g => { if (g) Trilhos.buscarCenas(leg); });
    });
  };

  /* ========================================================== horários reais */
  const horarios = {};      // chave do trecho → { status, itens, referencia, data }
  const FERRO = /RAIL|TRAIN|LONG_DISTANCE|HIGHSPEED|COACH|FERRY/;
  const OPERADORAS = {
    826: ['Eurostar', 'https://www.eurostar.com'], 250: ['SNCF Connect', 'https://www.sncf-connect.com'], 276: ['Deutsche Bahn', 'https://www.bahn.de'],
    380: ['Trenitalia', 'https://www.trenitalia.com'], 724: ['Renfe', 'https://www.renfe.com'], 756: ['SBB', 'https://www.sbb.ch'],
    40: ['ÖBB', 'https://www.oebb.at'], 528: ['NS International', 'https://www.nsinternational.com'], 56: ['SNCB', 'https://www.belgiantrain.be'],
    616: ['PKP Intercity', 'https://www.intercity.pl'], 203: ['České dráhy', 'https://www.cd.cz'], 348: ['MÁV', 'https://www.mavcsoport.hu'],
    620: ['CP', 'https://www.cp.pt'], 752: ['SJ', 'https://www.sj.se'], 578: ['Vy', 'https://www.vy.no'], 208: ['DSB', 'https://www.dsb.dk'],
    246: ['VR', 'https://www.vr.fi'], 703: ['ZSSK', 'https://www.zssk.sk'], 705: ['SŽ', 'https://potniski.sz.si'], 191: ['HŽPP', 'https://www.hzpp.hr'],
    642: ['CFR Călători', 'https://www.cfrcalatori.ro'], 100: ['BDŽ', 'https://www.bdz.bg'], 372: ['Irish Rail', 'https://www.irishrail.ie'],
    442: ['CFL', 'https://www.cfl.lu'], 440: ['LTG Link', 'https://ltglink.lt'], 428: ['Vivi', 'https://www.vivi.lv']
  };

  // Busca da Eurostar já preenchida (códigos UIC das estações usados pelo site).
  const EUROSTAR = { londres: '7015400', paris: '8727100', bruxelas: '8814001', amsterda: '8400058', colonia: '8015458' };
  Trilhos.linkCompra = function (leg, nome, url) {
    const o = EUROSTAR[leg.from], d = EUROSTAR[leg.to];
    if (!/eurostar\.com/i.test(url) || !o || !d) return url;
    const App = A(), seg = App.calc && App.calc.segByCity[leg.to];
    const data = seg ? seg.start : App.parseDate(App.state.dataSaida);
    return 'https://www.eurostar.com/search/uk-en?adult=' + (D.config.viajantes || 1) + '&origin=' + o + '&destination=' + d +
      (data ? '&outbound=' + App.iso(data) : '');
  };

  function hora(iso, tz) {
    try { return new Intl.DateTimeFormat('pt-BR', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
    catch (e) { return iso.slice(11, 16); }
  }

  // Resposta do Transitous → as 3 melhores opções.
  Trilhos.resumirPlano = function (json, tzDe, tzPara) {
    const its = ((json && json.itineraries) || []).map(it => {
      const legs = (it.legs || []).filter(l => l.mode !== 'WALK');
      const longos = legs.filter(l => FERRO.test(l.mode));
      if (!longos.length) return null;
      const nomes = [];
      longos.forEach(l => { const n = (l.displayName || l.routeShortName || l.tripShortName || '').trim(); if (n && nomes.indexOf(n) < 0) nomes.push(n); });
      const principal = longos.slice().sort((a, b) => b.duration - a.duration)[0];
      return { sai: hora(it.startTime, tzDe), chega: hora(it.endTime, tzPara), h: it.duration / 3600, trocas: Math.max(0, legs.length - 1),
        nomes: nomes.slice(0, 4), operadora: principal.agencyName || '', url: principal.agencyUrl || '' };
    }).filter(Boolean);
    // melhor = mais rápido, com 20 min de "multa" por baldeação; sem opções repetidas
    const vistos = {};
    return its.sort((a, b) => (a.h + a.trocas / 3) - (b.h + b.trocas / 3))
      .filter(i => { const k = i.sai + i.chega; if (vistos[k]) return false; vistos[k] = true; return true; })
      .slice(0, 3).sort((a, b) => (a.sai < b.sai ? -1 : 1));
  };

  Trilhos.buscarHorarios = function (legKey) {
    const App = A(), leg = App.calc.legs.find(l => l.key === legKey);
    if (!leg || leg.intl) return;
    const a = App.city(leg.from), b = App.city(leg.to), pa = a.estacao || a, pb = b.estacao || b;
    const seg = App.calc.segByCity[leg.to];
    const q = Trilhos.dataConsulta(seg ? seg.start : App.parseDate(App.state.dataSaida), App.parseDate(App.iso(new Date())));
    const iso = App.iso(q.data);
    const url = TRANSITOUS + '?fromPlace=' + pa.lat + ',' + pa.lon + '&toPlace=' + pb.lat + ',' + pb.lon + '&time=' + iso + 'T05:00:00Z';
    horarios[legKey] = { status: 'carregando' };
    avisar();
    Net.getJSON(url, { fila: 'horarios', ttl: TTL_HORARIO, chave: 'plano:' + leg.from + '>' + leg.to + ':' + iso, timeout: 40000,
      reduzir: j => Trilhos.resumirPlano(j, D.fusos[a.paisIso], D.fusos[b.paisIso]) })
      .then(r => { horarios[legKey] = { status: r.data.length ? 'ok' : 'vazio', itens: r.data, referencia: q.referencia, data: q.data }; })
      .catch(() => { horarios[legKey] = { status: 'erro' }; })
      .then(avisar);
  };

  /* ================================================================ interface */
  let timer = null;
  function avisar() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (A().calc) window.UI.renderAll(); }, 200);
  }

  const esc = s => window.UI.esc(s);

  // Bloco extra do cartão do trecho (só para trem): traçado, horários reais e paisagens.
  Trilhos.legHtml = function (leg) {
    if (leg.intl || leg.modo !== 'trem') return '';
    const App = A(), F = window.Fmt, key = esc(leg.key), o = leg.opts.trem, st = leg.st;
    let html = '<div class="rail">';

    // --- horários reais
    const h = horarios[leg.key];
    if (o.hReal) {
      html += '<p class="rail-ok">Usando a duração de um horário real' + (st.partida && st.partida.trem ? ' (parte às ' + esc(st.partida.trem) + ')' : '') +
        ' · <button type="button" class="lnk" data-act="rail-reset" data-leg="' + key + '">voltar à estimativa</button></p>';
    }
    if (!h) html += '<button type="button" class="btn sm" data-act="rail-times" data-leg="' + key + '" data-fid="rt-' + key + '">Ver horários reais</button>';
    else if (h.status === 'carregando') html += '<p class="muted">Buscando horários…</p>';
    else if (h.status === 'erro') html += '<p class="muted">Não foi possível buscar os horários agora. <button type="button" class="lnk" data-act="rail-times" data-leg="' + key + '">Tentar de novo</button></p>';
    else if (h.status === 'vazio') html += '<p class="muted">Nenhum horário encontrado para este trecho.</p>';
    else {
      const op = OPERADORAS[App.city(leg.from).paisIso];
      html += '<div class="rail-h"><b>' + (h.referencia ? 'Horário de referência' : 'Horários') + '</b><small>' + F.dow(h.data) + ', ' + F.data(h.data) +
        (h.referencia ? ' — a sua data ainda não tem horário publicado; este é o mesmo dia da semana' : '') + '</small></div><ul class="rail-list">' +
        h.itens.map((i, n) => '<li><div><b>' + esc(i.sai) + ' → ' + esc(i.chega) + '</b><span>' + F.horas(i.h) + ' · ' +
          (i.trocas ? i.trocas + (i.trocas > 1 ? ' baldeações' : ' baldeação') : 'direto') + '</span><small>' + esc(i.nomes.join(' + ') || i.operadora) + '</small></div>' +
          '<button type="button" class="btn sm" data-act="rail-use" data-leg="' + key + '" data-n="' + n + '">Usar esta duração</button></li>').join('') + '</ul>';
      const links = [];
      h.itens.forEach(i => { if (i.url && /^https?:\/\//.test(i.url) && !links.some(l => l[1] === i.url)) links.push([i.operadora || 'Operadora', i.url]); });
      if (!links.length && op) links.push(op);
      if (links.length) html += '<div class="links tight">' + links.slice(0, 2).map(l => '<a class="btn" href="' + esc(Trilhos.linkCompra(leg, l[0], l[1])) + '" target="_blank" rel="noopener noreferrer">Comprar: ' + esc(l[0]) + ' ↗</a>').join('') + '</div>';
      html += '<p class="muted">Fonte: Transitous. Confira no site da operadora antes de comprar.</p>';
    }

    // --- paisagens no caminho
    const km = Trilhos.km(leg), c = Trilhos.cenas(leg);
    if (c && c.lista.length) {
      const dur = o.horas, partida = st.partida && st.partida.trem ? st.partida.trem : null;
      const quando = x => {
        const t = dur * x.km / c.total;
        if (partida) { const m = (+partida.slice(0, 2)) * 60 + (+partida.slice(3, 5)) + Math.round(t * 60); return '~' + String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
        return '~' + F.horas(Math.max(0.05, t)) + ' após a partida';
      };
      const dica = Trilhos.sugestao(c.lista);
      html += '<div class="rail-h"><b>Paisagens no caminho</b><small>traçado real de ' + km.toLocaleString('pt-BR') + ' km</small></div>' +
        (dica ? '<p class="rail-tip">' + esc(dica) + '</p>' : '') + '<ul class="scenes">' +
        c.lista.map(x => '<li>' + window.UI.photoUrl(x.foto, x.nome, 'sc-ph') + '<div><b>' + esc(x.nome) + '</b><span>' + (x.lado === 'dir' ? 'janela direita' : 'janela esquerda') + ' · ' + quando(x) + '</span>' +
          (x.desc ? '<small>' + esc(x.desc) + '</small>' : '') + '</div>' + Trilhos.botaoAdd(leg, x) + '</li>').join('') + '</ul>';
    } else if (km) html += '<p class="muted">Traçado real de ' + km.toLocaleString('pt-BR') + ' km' + (c ? ' · nenhuma paisagem de destaque encontrada no caminho.' : ' · buscando paisagens no caminho…') + '</p>';
    else if (paradas(leg, 'trem')) html += '<p class="muted">' + (Net.online() ? 'Buscando o traçado real da ferrovia…' : 'Sem internet: mostrando o trecho em arco.') + '</p>';
    return html + '</div>';
  };

  // Botão "+ Adicionar" de uma paisagem (preenchido pela Feature 6: pontos criados pelo usuário).
  Trilhos.botaoAdd = function () { return ''; };

  Trilhos.bind = function () {
    const UI = window.UI;
    UI.actions['rail-times'] = t => Trilhos.buscarHorarios(t.dataset.leg);
    UI.actions['rail-use'] = t => {
      const App = A(), h = horarios[t.dataset.leg], st = App.state.legs[t.dataset.leg], i = h && h.itens && h.itens[+t.dataset.n];
      if (!i || !st) return;
      st.horas = Object.assign({}, st.horas, { trem: Math.round(i.h * 100) / 100 });
      st.partida = Object.assign({}, st.partida, { trem: i.sai });
      App.refresh();
      UI.toast('Duração do trecho atualizada para ' + window.Fmt.horas(i.h) + '.');
    };
    UI.actions['rail-reset'] = t => {
      const st = A().state.legs[t.dataset.leg];
      if (!st) return;
      delete st.horas; delete st.partida;
      A().refresh();
    };
    UI.actions['rail-preload'] = () => Trilhos.preCarregar();
  };
})();
