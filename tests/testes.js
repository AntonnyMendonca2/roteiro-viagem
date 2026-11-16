/* ==========================================================================
   Testes das funções puras do app. Abra tests/index.html no navegador
   (funciona em file:// e no GitHub Pages). Sem npm, sem bibliotecas.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA, App = window.App, T = App._t;
  const grupos = [];
  let grupoAtual = null;

  function grupo(nome) { grupoAtual = { nome, testes: [] }; grupos.push(grupoAtual); }
  function teste(nome, fn) { grupoAtual.testes.push({ nome, fn }); }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'condição falsa'); }
  function igual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg ? msg + ': ' : '') + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
  }
  function perto(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= (tol == null ? 1e-6 : tol))) throw new Error((msg ? msg + ': ' : '') + a + ' ≠ ' + b);
  }
  window.Teste = { grupo, teste, ok, igual, perto };

  // Estado limpo (padrão do data.js) antes de cada teste.
  function novoEstado() { App.state = T.sanitize(T.defaults()); return App.state; }
  window.Teste.novoEstado = novoEstado;

  // Todas as permutações de uma lista (força bruta).
  function permutacoes(xs) {
    if (xs.length <= 1) return [xs.slice()];
    const out = [];
    xs.forEach((x, i) => permutacoes(xs.slice(0, i).concat(xs.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }
  window.Teste.permutacoes = permutacoes;

  /* ------------------------------------------------------------ rota (TSP) */
  grupo('Rota inteligente');

  teste('Held-Karp encontra o mesmo custo da força bruta (7 cidades, 3 critérios)', () => {
    novoEstado();
    const ids = D.cities.slice(0, 9).map(c => c.id), first = ids[0], last = ids[8], mid = ids.slice(1, 8);
    const custo = (ordem, crit) => {
      const seq = [first].concat(ordem, [last]);
      let t = 0;
      for (let i = 0; i < seq.length - 1; i++) t += T.pairCost(seq[i], seq[i + 1], crit);
      return t;
    };
    ['tempo', 'custo', 'distancia'].forEach(crit => {
      const hk = custo(T.heldKarp(mid, first, last, crit), crit);
      const bruto = Math.min.apply(null, permutacoes(mid).map(p => custo(p, crit)));
      perto(hk, bruto, 1e-6, crit);
    });
  });

  teste('Held-Karp sem pontas fixas (Viracopos → cidades → Viracopos)', () => {
    novoEstado();
    const ids = D.cities.slice(0, 6).map(c => c.id);
    const hk = T.routeCost(T.heldKarp(ids, 'vcp', 'vcp', 'distancia'), 'distancia');
    const bruto = Math.min.apply(null, permutacoes(ids).map(p => T.routeCost(p, 'distancia')));
    perto(hk, bruto, 1e-6);
  });

  teste('trainPath: Londres → Zurique passa por Paris (Eurostar + TGV Lyria)', () => {
    novoEstado();
    const r = T.trainPath('londres', 'zurique');
    ok(r, 'sem caminho');
    ok(r.vias.some(v => v.cityId === 'paris'), 'não passou por Paris');
    perto(r.h[0], 2.33 + 4 + 0.5, 0.01, 'tempo com baldeação');
    igual(r.eur, [100, 270], 'faixa de preço somada');
  });

  teste('trainPath: mesma cidade e cidade sem ligação', () => {
    novoEstado();
    igual(T.trainPath('paris', 'paris').vias, [], 'mesma cidade: sem paradas');
    ok(T.trainPath('paris', 'atenas') === null, 'Atenas não tem trem na tabela');
  });

  teste('2-opt + Or-opt chega perto do ótimo (Held-Karp) em 10 cidades', () => {
    novoEstado();
    const ids = ['londres', 'madri', 'roma', 'praga', 'estocolmo', 'atenas', 'amsterda', 'viena', 'lisboa', 'copenhague', 'istambul', 'dublin'];
    const first = ids[0], last = ids[11], mid = ids.slice(1, 11);
    const custo = (ordem, crit) => {
      const seq = [first].concat(ordem, [last]);
      let t = 0;
      for (let i = 0; i < seq.length - 1; i++) t += T.pairCost(seq[i], seq[i + 1], crit);
      return t;
    };
    ['distancia', 'tempo'].forEach(crit => {
      const exato = custo(T.heldKarp(mid, first, last, crit), crit);
      // parte de uma ordem ruim de propósito (invertida e embaralhada)
      const ruim = [mid[5], mid[0], mid[9], mid[2], mid[7], mid[4], mid[1], mid[8], mid[3], mid[6]];
      const aprox = custo(T.heuristica(ruim, first, last, crit), crit);
      ok(aprox >= exato - 1e-6, 'a heurística não pode ser melhor que o ótimo');
      ok(aprox <= exato * 1.05, crit + ': heurística ' + aprox.toFixed(1) + ' × ótimo ' + exato.toFixed(1));
    });
  });

  teste('Rota com 20 cidades usa a heurística e termina rápido', () => {
    const S = novoEstado();
    const ids = D.cities.slice(0, 20).map(c => c.id);
    S.otim.fixarPontas = true;
    ok(App.rotaAproximada(ids.length), 'deveria avisar "rota aproximada"');
    const t0 = performance.now(), r = App.optimize(ids, ids);
    ok(performance.now() - t0 < 1500, 'demorou demais');
    igual(r.slice().sort(), ids.slice().sort(), 'mesmas cidades');
    igual([r[0], r[19]], [ids[0], ids[19]], 'pontas fixas');
    ok(T.routeCost(r, 'tempo') <= T.routeCost(ids, 'tempo') + 1e-6, 'não pode piorar a ordem recebida');
  });

  teste('Rede por terra: ônibus e balsa entram onde não há trem', () => {
    novoEstado();
    ok(T.trainPath('tirana', 'ohrid') === null, 'Albânia não tem trem');
    const p = T.caminho('tirana', 'dubrovnik', App.TERRESTRES);
    ok(p && p.modos.indexOf('onibus') >= 0, 'Tirana → Dubrovnik de ônibus');
    const d = T.estimar('dublin', 'paris');
    ok(d.balsa && !d.trem, 'Dublin → Paris por terra exige balsa');
    igual(d.padrao, 'aviao', 'acima de 9h o padrão é avião');
    ok(T.estimar('reykjavik', 'paris').aviso, 'Islândia: só avião');
    const leg = T.legDef('helsinque', 'tallinn').def;
    ok(leg.balsa && !leg.trem && !leg.aviao, 'Helsinque ↔ Tallinn: só balsa');
  });

  teste('Todas as cidades têm os campos novos e pelo menos 2 pontos', () => {
    D.cities.forEach(c => {
      ok(c.diariaHospedagem > 0 && c.diariaGastos > 0, c.id + ': diárias');
      ok(c.moeda in D.cambio || c.moeda === 'BRL', c.id + ': moeda sem câmbio');
      ok(D.fusos[c.paisIso], c.id + ': fuso horário');
      ok(D.pois.filter(p => p.cityId === c.id).length >= 2, c.id + ': poucos pontos');
    });
    D.pois.forEach(p => ok(p.duracaoH > 0 && p.preco && p.preco.cur in D.simbolos && p.desc.length > 30, p.id));
    igual(D.cities.filter(c => c.selecionada).map(c => c.id), ['londres', 'paris', 'cracovia'], 'roteiro padrão');
    igual(D.pois.filter(p => p.selecionado && ['londres', 'paris', 'cracovia'].indexOf(p.cityId) < 0), [], 'nenhum ponto novo selecionado');
  });

  /* ---------------------------------------------------------------- câmbio */
  grupo('Câmbio');

  teste('Frankfurter (base EUR) vira "1 unidade = X reais"', () => {
    const r = window.Cambio.converter({ BRL: 6.3, GBP: 0.84, PLN: 4.2, HUF: 390 });
    perto(r.EUR, 6.3); perto(r.GBP, 7.5); perto(r.PLN, 1.5); perto(r.HUF, 0.01615, 1e-5);
  });

  teste('Conversão com spread e IOF', () => {
    const S = novoEstado();
    S.cambio.EUR = 6; S.spread = 0; S.iof = false;
    perto(App.toBRL(100, 'EUR'), 600);
    S.spread = 4;
    perto(App.toBRL(100, 'EUR'), 624);
    S.iof = true;
    perto(App.toBRL(100, 'EUR'), 600 * 1.04 * (1 + D.config.iofPct / 100));
    perto(App.toBRL(100, 'BRL'), 100, 0, 'reais não sofrem spread nem IOF');
    perto(App.toBRL('', 'EUR'), 0);
  });

  teste('Série histórica e estatísticas (variação e média)', () => {
    const h = { '2026-01-01': { BRL: 6, GBP: 0.8 }, '2026-01-02': { BRL: 6.6, GBP: 0.8 }, '2026-01-03': { BRL: 6.3, GBP: 0.84 } };
    const s = window.Cambio.serie(h, 'GBP');
    igual(s.map(p => p.d), ['2026-01-01', '2026-01-02', '2026-01-03']);
    perto(s[0].v, 7.5); perto(s[2].v, 7.5);
    const st = window.Cambio.stats(window.Cambio.serie(h, 'EUR'));
    perto(st.varPct, 5, 1e-9); perto(st.media, 6.3, 1e-9); perto(st.vsMediaPct, 0, 1e-9);
  });

  /* ----------------------------------------------------------------- clima */
  grupo('Clima e luz do dia');

  teste('Nascer e pôr do sol (NOAA): Paris em 06/03/2027', () => {
    const s = window.Clima.sol(48.8566, 2.3522, new Date(Date.UTC(2027, 2, 6, 12)), 'Europe/Paris');
    perto(s.nascerH, 7 + 21 / 60, 0.15, 'nascer ~07:21');
    perto(s.porH, 18 + 41 / 60, 0.15, 'pôr ~18:41');
    perto(s.luzH, 11.33, 0.2, 'horas de luz');
  });

  teste('Noite polar e sol da meia-noite (Rovaniemi fica perto do limite; Tromsø passa)', () => {
    igual(window.Clima.solUTC(69.65, 18.96, new Date(Date.UTC(2026, 11, 21, 12))).polar, 'noite');
    igual(window.Clima.solUTC(69.65, 18.96, new Date(Date.UTC(2027, 5, 21, 12))).polar, 'dia');
  });

  teste('Climatologia: média por dia do ano, % de chuva e de neve', () => {
    const time = [], tx = [], tn = [], ch = [], nv = [];
    for (let ano = 2016; ano < 2026; ano++) for (let dia = 1; dia <= 31; dia++) {
      time.push(ano + '-03-' + String(dia).padStart(2, '0'));
      tx.push(10); tn.push(2); ch.push(ano % 2 ? 5 : 0); nv.push(ano === 2016 ? 1 : 0);
    }
    const c = window.Clima.reduzir({ time, temperature_2m_max: tx, temperature_2m_min: tn, precipitation_sum: ch, snowfall_sum: nv });
    const k = window.Clima.indice(3, 15);
    perto(c.tx[k], 10); perto(c.tn[k], 2); igual(c.pc[k], 50); igual(c.pn[k], 10);
    igual(c.tx[window.Clima.indice(7, 1)], null, 'sem dados em julho');
  });

  teste('Ícone do dia e lista "o que levar"', () => {
    igual(window.Clima.icone({ tx: 0, tn: -5, pc: 40, pn: 45 }), 'neve');
    igual(window.Clima.icone({ tx: 12, tn: 5, pc: 60, pn: 0 }), 'chuva');
    igual(window.Clima.icone({ tx: 20, tn: 10, pc: 10, pn: 0 }), 'sol');
    const l = window.Clima.listaLevar({ tmin: -3, tmax: 12, chuva: 40, neve: 25 });
    ok(l.indexOf('luvas') >= 0 && l.indexOf('gorro') >= 0 && l.some(x => /segunda pele/.test(x)), 'frio abaixo de zero');
    ok(l.some(x => /guarda-chuva/.test(x)), 'chuva frequente');
    igual(window.Clima.listaLevar({ tmin: 18, tmax: 24, chuva: 5, neve: 0 }), []);
  });

  /* --------------------------------------------------- trens e paisagens */
  grupo('Rota real dos trens e paisagens');

  teste('Links salvos: Airbnb sem rastreio, só http(s) vira botão', () => {
    const U = window.UI;
    igual(U.limparLink('https://www.airbnb.com.br/rooms/12796557?adults=1&check_in=2027-03-06&check_out=2027-03-10&search_mode=regular_search&source_impression_id=p3_x&modal=PHOTO_TOUR_SCROLLABLE'),
      'https://www.airbnb.com.br/rooms/12796557?adults=1&check_in=2027-03-06&check_out=2027-03-10');
    igual(U.limparLink('https://www.booking.com/hotel/fr/x.pt-br.html?aid=1&checkin=2027-03-06&checkout=2027-03-10&group_adults=2'),
      'https://www.booking.com/hotel/fr/x.pt-br.html?checkin=2027-03-06&checkout=2027-03-10&group_adults=2');
    igual(U.limparLink(' https://www.skyscanner.com.br/x?a=1 '), 'https://www.skyscanner.com.br/x?a=1');
    igual(U.linkSeguro('javascript:alert(1)'), '');
    igual(U.linkSeguro('www.airbnb.com'), '');
  });

  teste('Comprar na Eurostar abre a busca já preenchida (estações, data e passageiros)', () => {
    const leg = { from: 'londres', to: 'paris' }, seg = App.calc && App.calc.segByCity.paris;
    const u = window.Trilhos.linkCompra(leg, 'Eurostar', 'https://www.eurostar.com');
    ok(/^https:\/\/www\.eurostar\.com\/search\/uk-en\?/.test(u), 'página de busca');
    ok(/origin=7015400/.test(u) && /destination=8727100/.test(u), 'St Pancras → Gare du Nord');
    ok(/adult=\d+/.test(u), 'passageiros');
    if (seg) ok(u.indexOf('outbound=' + App.iso(seg.start)) >= 0, 'data do trecho');
    igual(window.Trilhos.linkCompra(leg, 'SNCF', 'https://www.sncf-connect.com'), 'https://www.sncf-connect.com');
    igual(window.Trilhos.linkCompra({ from: 'paris', to: 'nice' }, 'Eurostar', 'https://www.eurostar.com'), 'https://www.eurostar.com');
  });

  teste('Lado da janela: linha para o leste, lugar ao norte = esquerda; ao sul = direita', () => {
    const linha = [[0, 45], [1, 45], [2, 45]];
    const norte = window.Trilhos.lado(linha, { lat: 45.05, lon: 0.5 }), sul = window.Trilhos.lado(linha, { lat: 44.95, lon: 1.5 });
    igual(norte.lado, 'esq'); igual(sul.lado, 'dir');
    perto(norte.km, window.Trilhos.acumulado(linha)[1] / 2, 0.5, 'km até o ponto mais próximo');
    perto(norte.distKm, 5.56, 0.2, 'distância até os trilhos');
    // no sentido contrário, os lados se invertem
    const volta = linha.slice().reverse();
    igual(window.Trilhos.lado(volta, { lat: 45.05, lon: 0.5 }).lado, 'dir');
  });

  teste('Douglas-Peucker: mantém as pontas e os cantos, descarta pontos colineares', () => {
    const linha = [];
    for (let i = 0; i <= 500; i++) linha.push([i / 100, 45 + (i <= 250 ? 0 : (i - 250) / 100)]);
    const s = window.Trilhos.simplificar(linha, 100);
    ok(s.length <= 100 && s.length >= 3, 'tamanho ' + s.length);
    igual(s[0], [0, 45]); igual(s[s.length - 1], [5, 47.5]);
    ok(s.some(p => Math.abs(p[0] - 2.5) < 0.02 && Math.abs(p[1] - 45) < 0.02), 'o canto foi mantido');
  });

  teste('Amostragem a cada ~28 km e escolha de paisagens bem distribuídas', () => {
    const linha = [[0, 45], [4, 45]];
    const total = window.Trilhos.acumulado(linha)[1];
    const am = window.Trilhos.amostrar(linha, 28);
    perto(am.length, Math.round(total / 28), 1);
    const cands = [];
    for (let i = 0; i < 20; i++) cands.push({ titulo: 'L' + i, km: total * (i + 0.5) / 20, cenico: 1 + (i % 3), views: 1000 * (i + 1) });
    const esc = window.Trilhos.escolher(cands, total);
    ok(esc.length >= 3 && esc.length <= 8, 'entre 3 e 8');
    for (let i = 1; i < esc.length; i++) ok(esc[i].km > esc[i - 1].km, 'em ordem de passagem');
    ok(esc[esc.length - 1].km - esc[0].km > total * 0.5, 'espalhadas pelo percurso');
  });

  teste('Sugestão de lado e data de referência dos horários', () => {
    const l = ['dir', 'dir', 'esq', 'dir', 'dir', 'esq', 'dir'].map(x => ({ lado: x }));
    igual(window.Trilhos.sugestao(l), 'Sente do lado direito: 5 das 7 paisagens ficam à direita.');
    igual(window.Trilhos.sugestao([{ lado: 'dir' }, { lado: 'esq' }]), '');
    const hoje = new Date(Date.UTC(2026, 10, 15, 12));
    const longe = window.Trilhos.dataConsulta(new Date(Date.UTC(2027, 2, 6, 12)), hoje);      // sábado, março de 2027
    ok(longe.referencia, 'data distante vira referência');
    igual(longe.data.getUTCDay(), 6, 'mesmo dia da semana');
    ok(longe.data > hoje && (longe.data - hoje) / 86400000 <= 14, 'numa data próxima');
    ok(!window.Trilhos.dataConsulta(new Date(Date.UTC(2026, 10, 20, 12)), hoje).referencia, 'data próxima usa a própria data');
  });

  teste('Resumo do Transitous: trem direto, horários locais e baldeações', () => {
    const plano = { itineraries: [
      { startTime: '2026-11-24T08:20:00Z', endTime: '2026-11-24T12:29:00Z', duration: 14940, legs: [
        { mode: 'WALK', duration: 60 }, { mode: 'HIGHSPEED_RAIL', duration: 14700, displayName: 'TGV Lyria 9211', agencyName: 'SNCF', agencyUrl: 'https://www.sncf.com' }, { mode: 'WALK', duration: 60 }] },
      { startTime: '2026-11-24T07:04:00Z', endTime: '2026-11-24T12:06:00Z', duration: 18120, legs: [
        { mode: 'SUBWAY', duration: 600, displayName: '5' }, { mode: 'HIGHSPEED_RAIL', duration: 9000, displayName: 'TGV 2365' }, { mode: 'REGIONAL_RAIL', duration: 3000, displayName: 'TER 96251' }, { mode: 'LONG_DISTANCE', duration: 3200, displayName: 'IC3' }] },
      { startTime: '2026-11-24T07:00:00Z', endTime: '2026-11-24T07:30:00Z', duration: 1800, legs: [{ mode: 'WALK', duration: 1800 }] }
    ] };
    const r = window.Trilhos.resumirPlano(plano, 'Europe/Paris', 'Europe/Zurich');
    igual(r.length, 2, 'itinerário só a pé é descartado');
    const direto = r.find(i => i.trocas === 0);
    igual([direto.sai, direto.chega], ['09:20', '13:29']);
    perto(direto.h, 4.15, 0.01);
    igual(direto.nomes, ['TGV Lyria 9211']);
    igual(r.find(i => i.trocas > 0).trocas, 3);
  });

  /* -------------------------------------------------------- trajetos a pé */
  grupo('Trajetos a pé');

  teste('Sem matriz: estimativa em linha reta × 1,3 a 4,8 km/h', () => {
    novoEstado();
    const a = { lat: 48.85, lon: 2.35 }, b = { lat: 48.85 + 1 / 111.195, lon: 2.35 };      // ~1 km ao norte
    const e = window.Ape.estimar(a, b);
    perto(e.km, 1.3, 0.01); perto(e.min, 1.3 / 4.8 * 60, 0.2); igual(e.real, false);
    const p = App.poi('louvre'), r = window.Ape.ate(p);
    igual(r.real, false, 'sem matriz no cache, é estimativa');
    ok(window.Ape.texto(p).longo.indexOf('estimativa') > 0);
  });

  teste('Com matriz no cache: usa tempo e distância reais (da hospedagem ou do centro)', () => {
    novoEstado();
    window.Ape.carregar = () => Promise.resolve(null);                 // sem rede nos testes
    // descobre a chave que o módulo usaria e grava uma matriz falsa 2×2 (origem, Louvre)
    const real = window.Net.peek;
    let chave = null;
    window.Net.peek = k => { if (/^ape:m:paris:/.test(k)) chave = k; return real(k); };
    window.Ape.matrizDe('paris');
    window.Net.peek = real;
    ok(chave, 'chave da matriz');
    const ids = ['_o'].concat(App.poisOf('paris').map(p => p.id));
    const n = ids.length, dur = [], dist = [];
    for (let i = 0; i < n; i++) { dur.push(new Array(n).fill(120)); dist.push(new Array(n).fill(1000)); }
    window.Net.cacheSet(chave, { ids, dur, dist });
    const r = window.Ape.ate(App.poi('louvre'));
    igual(r.real, true); perto(r.min, 12); perto(r.km, 1);
    ok(window.Ape.texto(App.poi('louvre')).longo.indexOf('pelas ruas') > 0);
    window.Net.cacheDel(chave);
  });

  teste('Bate-volta distante fica fora da matriz e sugere transporte', () => {
    novoEstado();
    const t = window.Ape.texto(App.poi('disneyland'));
    ok(t.longe && /linha reta/.test(t.longo));
  });

  /* ---------------------------------------------------- descobrir por perto */
  grupo('Descobrir por perto e pontos do usuário');

  teste('Filtro: artigos reais do geosearch de Paris que NÃO são lugares', () => {
    const naoLugares = [
      { titulo: 'Paris Commune', desc: 'Revolutionary city council of Paris of 1871' },
      { titulo: 'Second French Empire', desc: '1852–1870 empire in France' },
      { titulo: 'July Monarchy', desc: 'Kingdom governing France, 1830–1848' },
      { titulo: 'Siege of Paris (1870–1871)', desc: 'Siege during the Franco-Prussian War' },
      { titulo: 'November 2015 Paris attacks', desc: 'Series of coordinated terrorist attacks' },
      { titulo: 'French Third Republic', desc: 'Nation of France from 1870 to 1940' },
      { titulo: 'Molière', desc: 'French playwright and actor (1622–1673)' },
      { titulo: 'Liberation of Paris', desc: 'Military battle that took place during World War II' },
      { titulo: 'Agence France-Presse', desc: 'French international news agency' },
      { titulo: 'Paris Saint-Germain FC', desc: 'Association football club in Paris, France' },
      { titulo: '1900 Summer Olympics', desc: 'Games of the II Olympiad' }
    ];
    naoLugares.forEach(i => ok(!window.Wiki.ehLugar(i), 'deveria descartar: ' + i.titulo));
    const lugares = [
      { titulo: 'Panthéon', desc: 'Mausoleum in Paris, France' },
      { titulo: 'Palais Garnier', desc: 'Opera house in Paris, France' },
      { titulo: 'Père Lachaise Cemetery', desc: 'Cemetery in Paris, France' },
      { titulo: 'Luxembourg Gardens', desc: 'Park in Paris, France' },
      { titulo: 'Pont Neuf', desc: 'Bridge across the Seine in Paris' },
      { titulo: 'Les Invalides', desc: 'Building complex in Paris, France' },
      { titulo: 'Centre Pompidou', desc: 'Art museum and cultural centre in Paris, France' }
    ];
    lugares.forEach(i => ok(window.Wiki.ehLugar(i), 'deveria manter: ' + i.titulo));
  });

  teste('Filtro: descarta a própria cidade, pontos já cadastrados e ocultados', () => {
    const itens = [
      { titulo: 'Paris', nome: 'Paris', desc: 'Capital of France' },
      { titulo: 'Louvre', nome: 'Museu do Louvre', desc: 'Art museum in Paris, France' },
      { titulo: 'Sainte-Chapelle', nome: 'Sainte-Chapelle', desc: 'Royal chapel in Paris' },
      { titulo: 'Panthéon', nome: 'Panteão de Paris', desc: 'Mausoleum in Paris, France', foto: 'x' },
      { titulo: 'Pont Neuf', nome: 'Pont Neuf', desc: 'Bridge across the Seine in Paris' },
      { titulo: 'Panthéon', nome: 'Panteão de Paris', desc: 'repetido' }
    ];
    const ctx = { cidade: ['Paris'], wikis: ['Louvre'], nomes: ['Sainte-Chapelle'], ocultos: ['Pont Neuf'] };
    igual(window.Descobrir.filtrar(itens, ctx).map(i => i.titulo), ['Panthéon']);
  });

  teste('Candidatos preferem quem tem foto; a ordem final é por acessos', () => {
    const c = window.Descobrir.candidatos([{ titulo: 'a', dist: 1 }, { titulo: 'b', foto: 'x', dist: 5 }, { titulo: 'c', foto: 'x', dist: 2 }, { titulo: 'd', foto: 'x', pt: true, desc: 'Art museum in Paris', dist: 9 }], 3);
    igual(c.map(i => i.titulo), ['d', 'c', 'b']);
    igual(window.Descobrir.grade({ lat: 48.85, lon: 2.35 }).length, 9, 'grade 3 × 3');
    ok(!window.Wiki.ehLugar({ titulo: '4th arrondissement of Paris', desc: 'Municipal arrondissement in Paris' }), 'divisão administrativa');
    ok(window.Wiki.ehLugar({ titulo: 'Centre Pompidou', desc: 'High-tech architecture building in the 4th arrondissement of Paris' }), 'Pompidou é lugar');
    igual(window.Descobrir.ordenar([{ titulo: 'a', views: 10 }, { titulo: 'b', views: 500 }, { titulo: 'c', views: 50 }]).map(i => i.titulo), ['b', 'c', 'a']);
  });

  teste('Ponto do usuário entra em tudo: lista, totais, exportar/importar e exclusão', () => {
    const S = novoEstado();
    window.MapView.rebuildPois = () => {}; App.refresh = () => { App.calc = T.compute(); };
    S.spread = 0;
    App.calc = T.compute();
    const antes = App.calc.total;
    const p = window.Descobrir.novoPonto({ titulo: 'Panthéon', nome: 'Panteão de Paris', pt: true, desc: 'mausoleum in Paris', lat: 48.8462, lon: 2.3464, foto: 'f' }, 'paris', 'EUR');
    ok(/^u-/.test(p.id) && p.custom && p.preco.v === 0, 'formato');
    App.addCustomPoi(p);
    ok(App.poi(p.id) === p && App.poisOf('paris').indexOf(p) >= 0, 'aparece na cidade');
    ok(App.poiActive(p.id), 'entra selecionado (a cidade está no roteiro)');
    S.pois[p.id].valor.v = 10;
    App.refresh();
    perto(App.calc.total - antes, 10 * S.cambio.EUR, 1e-6, 'o valor entra no total');
    ok(App.calc.cats.atracoes > 0, 'entra em atrações');
    // exportar → importar
    const copia = T.sanitize(T.merge(T.defaults(), JSON.parse(JSON.stringify(S))));
    igual(copia.customPois.length, 1); igual(copia.pois[p.id].valor.v, 10);
    // um ponto inválido é descartado na importação
    const sujo = JSON.parse(JSON.stringify(S));
    sujo.customPois.push({ id: 'louvre', cityId: 'paris', nome: 'x', lat: 1, lon: 1, preco: { v: 0, cur: 'EUR' } }, { id: 'u-x', cityId: 'nao-existe', nome: 'x', lat: 1, lon: 1, preco: {} });
    igual(T.sanitize(T.merge(T.defaults(), sujo)).customPois.length, 1);
    App.removeCustomPoi(p.id);
    ok(!App.poi(p.id) && !(p.id in S.pois), 'excluído');
  });

  /* ------------------------------------------------------------- dia a dia */
  grupo('Dia a dia');

  // cenário de teste: 3 dias (chegada na segunda, terça inteira, partida na quarta)
  function cenarioDias() {
    return [
      { iso: '2027-03-08', dow: 1, ini: 14, fim: 19, tipo: 'chegada' },
      { iso: '2027-03-09', dow: 2, ini: 9, fim: 19, tipo: 'inteiro' },
      { iso: '2027-03-10', dow: 3, ini: 9, fim: 12, tipo: 'partida' }
    ];
  }
  const P0 = { lat: 48.85, lon: 2.35 };
  const pt = (id, dLat, dLon, dur, extra) => Object.assign({ id, lat: 48.85 + dLat, lon: 2.35 + dLon, dur, longo: false, fechado: null, fixo: '', abre: null, fecha: null }, extra || {});
  function deslocReta(pontos) {
    const idx = { _o: P0 }; pontos.forEach(p => { idx[p.id] = p; });
    return (a, b) => (a === b || idx[a].longo || idx[b].longo ? { min: 0, modo: 'incluso' } : { min: App.distKm(idx[a], idx[b]) * 1.3 / 4.8 * 60, modo: 'pe' });
  }
  const onde = (plano, id) => plano.dias.find(d => d.itens.some(i => i.id === id)).iso;

  teste('Respeita dia fechado: museu que fecha na terça não cai na terça', () => {
    const pontos = [pt('museu', 0.004, 0.002, 3, { fechado: [2] }), pt('torre', 0.005, 0.003, 2), pt('igreja', -0.003, 0.001, 1), pt('praca', 0.001, -0.004, 1), pt('parque', -0.002, -0.003, 1.5)];
    const plano = window.DiaADia.planejar({ dias: cenarioDias(), pontos, desloc: deslocReta(pontos) });
    ok(onde(plano, 'museu') !== '2027-03-09', 'museu caiu na terça');
    igual(plano.dias.reduce((s, d) => s + d.itens.length, 0), 5, 'todos os pontos têm dia');
    plano.dias.forEach(d => igual(d.fechados, [], 'nenhum fechado em ' + d.iso));
  });

  teste('Dia fixo escolhido pelo usuário é mantido', () => {
    const pontos = [pt('a', 0.004, 0.002, 2, { fixo: '2027-03-10' }), pt('b', 0.005, 0.003, 2), pt('c', -0.003, 0.001, 1), pt('d', 0.02, 0.02, 2, { fixo: '2027-03-08' })];
    const plano = window.DiaADia.planejar({ dias: cenarioDias(), pontos, desloc: deslocReta(pontos) });
    igual(onde(plano, 'a'), '2027-03-10'); igual(onde(plano, 'd'), '2027-03-08');
    ok(plano.dias[2].itens.find(i => i.id === 'a').fixo, 'marcado como fixo');
  });

  teste('Bate-volta longo ocupa um dia inteiro sozinho', () => {
    const pontos = [pt('disney', 0.02, 0.4, 10, { longo: true }), pt('b', 0.005, 0.003, 2), pt('c', -0.003, 0.001, 1), pt('d', 0.002, 0.002, 1)];
    const plano = window.DiaADia.planejar({ dias: cenarioDias(), pontos, desloc: deslocReta(pontos) });
    const dia = plano.dias.find(d => d.itens.some(i => i.id === 'disney'));
    igual(dia.tipo, 'inteiro', 'vai para o dia inteiro'); igual(dia.itens.length, 1, 'sozinho no dia');
  });

  teste('Horários: sai da origem, respeita a abertura e volta; dia puxado gera sugestão', () => {
    const pontos = [pt('cedo', 0.004, 0, 1, { abre: 10 }), pt('perto', 0.001, 0, 1)];
    const dias = [{ iso: '2027-03-09', dow: 2, ini: 9, fim: 19, tipo: 'inteiro' }];
    const plano = window.DiaADia.planejar({ dias, pontos, desloc: deslocReta(pontos) });
    const d = plano.dias[0], cedo = d.itens.find(i => i.id === 'cedo');
    ok(cedo.chega >= 10 - 1e-9, 'não entra antes de abrir');
    igual(d.itens[0].id, 'perto', 'visita o que já está aberto primeiro');
    ok(d.volta.min > 0 && d.fim > d.itens[1].sai, 'volta para a origem');
    // dia puxado
    const muitos = [];
    for (let i = 0; i < 6; i++) muitos.push(pt('m' + i, 0.002 * i, 0.001, 2.2));
    const dois = [{ iso: '2027-03-09', dow: 2, ini: 9, fim: 19, tipo: 'inteiro' }, { iso: '2027-03-10', dow: 3, ini: 9, fim: 12, tipo: 'partida' }];
    const fixos = muitos.map(p => Object.assign({}, p, { fixo: p.id === 'm5' ? '' : '2027-03-09' }));
    const p2 = window.DiaADia.planejar({ dias: dois, pontos: fixos, desloc: deslocReta(fixos) });
    ok(p2.dias[0].puxado, 'mais de 10h de atividade');
  });

  teste('Plano real de Paris (dados do app): Louvre fora da terça, Disneyland em dia inteiro', () => {
    novoEstado();
    App.calc = T.compute();
    const pl = window.DiaADia.plano('paris');
    ok(pl && pl.n >= 4, 'tem pontos');
    const louvre = pl.dias.find(d => d.itens.some(i => i.id === 'louvre')), disney = pl.dias.find(d => d.itens.some(i => i.id === 'disneyland'));
    ok(louvre.dow !== 2, 'Louvre na terça');
    igual(disney.itens.length, 1); igual(disney.tipo, 'inteiro');
    ok(window.DiaADia.texto('paris').indexOf('Louvre') > 0, 'texto para copiar');
  });

  /* -------------------------------------------------------------- assistente */
  grupo('Assistente "o que cabe?"');

  function probReal(dias, orc, extra) {
    const S = novoEstado();
    App.calc = T.compute();
    Object.assign(S.assist, { dias, orcamento: orc }, extra || {});
    return window.Assistente.problema();
  }

  teste('Respeita o prazo e o orçamento (dados reais, 69 cidades)', () => {
    const prob = probReal(14, 12000);
    ['interesse', 'barata', 'equilibrada'].forEach(obj => {
      const r = window.Assistente.otimizar(prob, obj, { ms: 5000, maxIter: 20000, semente: 7 });
      ok(r.viavel || obj === 'barata', obj + ': inviável');
      ok(r.noitesTotal <= prob.N, obj + ': noites ' + r.noitesTotal + ' > ' + prob.N);
      ok(r.custo <= prob.orcamento + 1e-6, obj + ': custo ' + Math.round(r.custo) + ' > ' + Math.round(prob.orcamento));
      ok(r.ordem.length >= 2, obj + ': poucas cidades');
      igual(new Set(r.ordem).size, r.ordem.length, 'sem cidades repetidas');
      r.noites.forEach(n => ok(n >= prob.nMin && n <= prob.nMax, 'noites fora do limite'));
      // pontas fixas: Londres no começo e Cracóvia no fim
      igual([prob.ids[r.ordem[0]], prob.ids[r.ordem[r.ordem.length - 1]]], ['londres', 'cracovia'], obj + ': pontas');
    });
  });

  teste('Cidades obrigatórias entram, proibidas ficam de fora, estrelas pesam', () => {
    const S = novoEstado();
    App.calc = T.compute();
    Object.assign(S.assist, { dias: 16, orcamento: 20000, obrig: ['praga'], proib: ['paris', 'berlim'], pontas: false });
    S.interesse = { roma: 5, florenca: 5, veneza: 5 };
    DATA.cities.forEach(c => { if (!(c.id in S.interesse) && c.id !== 'praga') S.interesse[c.id] = 1; });
    const prob = window.Assistente.problema();
    const r = window.Assistente.otimizar(prob, 'interesse', { ms: 5000, maxIter: 25000, semente: 3 });
    const ids = r.ordem.map(i => prob.ids[i]);
    ok(ids.indexOf('praga') >= 0, 'Praga é obrigatória');
    ok(ids.indexOf('paris') < 0 && ids.indexOf('berlim') < 0, 'proibidas ficaram de fora');
    ok(['roma', 'florenca', 'veneza'].filter(x => ids.indexOf(x) >= 0).length >= 2, 'as cidades de 5 estrelas entram: ' + ids.join());
    ok(r.viavel);
  });

  teste('Orçamento apertado: a alternativa barata custa menos que a de mais interesse', () => {
    const prob = probReal(12, 9000);
    const a = window.Assistente.otimizar(prob, 'interesse', { ms: 5000, maxIter: 15000, semente: 11 });
    const b = window.Assistente.otimizar(prob, 'barata', { ms: 5000, maxIter: 15000, semente: 23, minInteresse: a.interesse * 0.6, inicial: a });
    ok(b.custo <= a.custo + 1e-6, 'barata ' + Math.round(b.custo) + ' × interesse ' + Math.round(a.custo));
    ok(b.interesse >= a.interesse * 0.6 - 1e-6, 'mantém 60% do interesse');
  });

  teste('avaliar(): trecho longo consome parte do dia; custo soma diárias, pontos e trechos', () => {
    const prob = probReal(12, 15000);
    const i = id => prob.ids.indexOf(id);
    const r = window.Assistente.avaliar(prob, [i('londres'), i('paris')], [3, 4], 45);
    const leg = prob.legs[i('londres')][i('paris')];
    const esperado = 3 * prob.custoNoite[i('londres')] + prob.custoFixo[i('londres')] + 4 * prob.custoNoite[i('paris')] + prob.custoFixo[i('paris')];
    ok(leg.some(o => Math.abs(r.custo - esperado - o[1]) < 1e-6), 'custo = diárias + pontos + trecho');
    igual(r.noites, 7);
    prob.ideal = prob.ideal.map(() => 2); prob.estrelas = prob.estrelas.map(() => 3);      // cidades iguais: só o trecho muda
    const perto1 = window.Assistente.avaliar(prob, [i('londres'), i('paris')], [3, 1], 45).interesse;
    const longe1 = window.Assistente.avaliar(prob, [i('londres'), i('istambul')], [3, 1], 45).interesse;
    ok(perto1 > longe1, 'uma noite depois de um trecho longo rende menos');
  });

  /* ------------------------------------------------------------ cenários */
  grupo('Cenários A/B/C');
  const Cen = window.Cenarios;

  teste('diff + merge reconstroem o estado (base do retrato dos cenários)', () => {
    const S = novoEstado();
    S.cities.roma.sel = true; S.cities.roma.noites = 4; S.dataSaida = '2027-04-10';
    S.legs['paris~zurique'] = { modo: 'aviao' };
    const d = T.diff(T.defaults(), S);
    ok(d.cities.roma.noites === 4 && Object.keys(d.cities).length === 1, 'só o que mudou entra no diff');
    const volta = T.sanitize(T.merge(T.defaults(), d));
    igual(Cen.retrato(volta), Cen.retrato(S));
    ok(T.diff({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } }) === undefined, 'iguais → undefined');
  });

  teste('Duplicar → alterar → comparar: cada total bate com o cálculo do próprio cenário', () => {
    const S = novoEstado();
    App.calc = T.compute({ leve: true });
    const totalA = App.calc.total, rotaA = App.calc.route.slice(), idA = S.cenarioAtivo;
    const b = Cen.criar('Com Roma', Cen.retrato(S));
    ok(Cen.ativar(S, b.id), 'trocou para a cópia');
    App.calc = T.compute({ leve: true });
    perto(App.calc.total, totalA, 0.01, 'a cópia nasce idêntica');
    // altera só o cenário B
    S.cities.roma.sel = true; S.cities.roma.ordem = 50; S.cities.roma.noites = 3;
    S.cities.roma.custos.hospedagem = { v: 900, cur: 'EUR' };
    App.calc = T.compute({ leve: true });
    const totalB = App.calc.total;
    ok(totalB > totalA + 100, 'B ficou mais caro');
    S.cenComparar = [idA];
    Cen.tocar();
    const rs = Cen.comparados();
    igual(rs.map(r => r.letra), ['B', 'A']);
    perto(rs[0].total, totalB, 0.01, 'total de B');
    perto(rs[1].total, totalA, 0.01, 'total de A (calculado à parte)');
    igual(rs[1].rota, rotaA);
    ok(rs[0].rota.indexOf('roma') >= 0 && rs[1].rota.indexOf('roma') < 0, 'Roma só existe em B');
    ok(rs[0].noites === rs[1].noites + 3 && rs[0].cidades === rs[1].cidades + 1, 'noites e cidades');
    // voltar para A devolve o roteiro original, e B continua guardado
    Cen.ativar(S, idA);
    App.calc = T.compute({ leve: true });
    perto(App.calc.total, totalA, 0.01, 'A intacto');
    ok(!S.cities.roma.sel, 'Roma não vazou para A');
    Cen.tocar();
    perto(Cen.resumo(b.id).total, totalB, 0.01, 'B guardado');
  });

  teste('Dados antigos (sem cenários): o roteiro atual vira "Cenário A"', () => {
    const antigo = JSON.parse(JSON.stringify(T.defaults()));
    delete antigo.cenarios; delete antigo.cenarioAtivo; delete antigo.cenComparar; delete antigo.cenNoMapa;
    antigo.cities.roma.sel = true;
    const S = App.lerPacote(JSON.stringify({ estado: antigo }));
    ok(S, 'leu o arquivo antigo');
    igual(S.cenarios.map(c => c.nome), ['Cenário A']);
    ok(S.cenarioAtivo === S.cenarios[0].id && S.cenarios[0].dados === null, 'ativo e "vivo"');
    ok(S.cities.roma.sel, 'o roteiro antigo foi mantido');
  });

  teste('Exportar e importar levam todos os cenários', () => {
    const S = novoEstado();
    const idA = S.cenarioAtivo;
    const b = Cen.criar('Só Leste', Cen.retrato(S));
    Cen.ativar(S, b.id);
    S.cities.cracovia.noites = 6;
    Cen.criar('Vazio', {});
    const txt = JSON.stringify(App.pacote());
    novoEstado();
    const N = App.lerPacote(txt);
    igual(N.cenarios.map(c => c.nome), ['Cenário A', 'Só Leste', 'Vazio']);
    ok(N.cenarioAtivo === b.id && N.cities.cracovia.noites === 6, 'cenário ativo e seus dados');
    App.state = N;
    Cen.ativar(N, idA);
    ok(N.cities.cracovia.noites !== 6, 'o cenário A veio com os dados dele');
    ok(N.cenarios.find(c => c.id === b.id).dados.cities.cracovia.noites === 6, 'B guardado com a alteração');
    ok(App.lerPacote('{"x":1}') === null && App.lerPacote('não é json') === null, 'arquivo inválido → null');
  });

  /* ------------------------------------------------------- link de compartilhamento */
  grupo('Link de compartilhamento');
  const Comp = window.Compartilhar;

  // roteiro "mexido": cidades, noites, valores, hospedagem, trecho, ponto do usuário e um 2º cenário
  function estadoMexido() {
    const S = novoEstado();
    S.dataSaida = '2027-05-02';
    S.cities.roma.sel = true; S.cities.roma.ordem = 60; S.cities.roma.noites = 4;
    S.cities.roma.custos.hospedagem = { v: 480, cur: 'EUR' };
    S.cities.londres.hosp = { nome: 'Hotel “Çà et là” – Ünïcode', lat: 51.51, lon: -0.12, link: 'https://www.airbnb.com.br/rooms/12796557?adults=1' };
    S.legs['paris~roma'] = { modo: 'aviao', real: { v: 310, cur: 'EUR' } };
    S.customPois.push({ id: 'u-teste1', cityId: 'roma', nome: 'Sorveteria da praça', lat: 41.9, lon: 12.5, preco: { v: 5, cur: 'EUR' }, tags: [], duracaoH: 1 });
    T.sanitize(S);
    S.pois['u-teste1'].sel = true;
    const b = Cen.criar('Só Leste', Cen.retrato(S));
    b.dados.cities.cracovia = { noites: 7 };
    return S;
  }

  teste('Compactar → descompactar: o estado volta igual (todos os cenários)', async () => {
    const S = estadoMexido();
    const cod = await Comp.codificar(Comp.montar(S, { todos: true }));
    ok(/^1[zj][A-Za-z0-9_-]+$/.test(cod), 'formato "versão + modo + base64url"');
    const N = Comp.estadoDe(await Comp.decodificar(cod));
    const sem = st => { const o = JSON.parse(JSON.stringify(st)); delete o.cambioInfo; delete o.ocultos; return o; };
    igual(sem(N), sem(S));
  });

  teste('Sem CompressionStream: o link vai em JSON puro e volta igual', async () => {
    const S = estadoMexido(), obj = Comp.montar(S, {});
    const puro = await Comp.codificar(obj, { semCompactar: true });
    ok(puro.charAt(1) === 'j', 'modo "j"');
    igual(await Comp.decodificar(puro), obj);
    const z = await Comp.codificar(obj);
    if (z.charAt(1) === 'z') ok(z.length < puro.length, 'o compactado é menor');
  });

  teste('Só o que difere do padrão entra no link; sem "todos", vai só o cenário ativo', () => {
    const S = estadoMexido(), obj = Comp.montar(S, {});
    igual(Object.keys(obj.cities).sort(), ['londres', 'roma']);
    ok(obj.cenarios.length === 1 && obj.cenarios[0].id === S.cenarioAtivo, 'só o cenário ativo');
    ok(obj.cambio === undefined && obj.cambioInfo === undefined, 'câmbio automático não vai no link');
    ok(Comp.montar(S, { todos: true }).cenarios.length === 2, 'com "todos", vão os dois');
    igual(Comp.montar(novoEstado(), {}).cities, undefined, 'roteiro padrão → nada de cidades no link');
  });

  teste('"Não incluir hospedagens e valores" tira hospedagens, gastos e valores reais', () => {
    const S = estadoMexido();
    S.gerais[Object.keys(S.gerais)[0]].v = 9999; S.orcamento = 22222;
    const txt = JSON.stringify(Comp.montar(S, { privado: true, todos: true }));
    ok(txt.indexOf('Hotel') < 0 && txt.indexOf('480') < 0 && txt.indexOf('310') < 0 && txt.indexOf('9999') < 0 && txt.indexOf('22222') < 0, 'nada de valores: ' + txt.slice(0, 200));
    const N = Comp.estadoDe(JSON.parse(txt));
    ok(N.cities.roma.sel && N.cities.roma.noites === 4 && N.legs['paris~roma'].modo === 'aviao', 'o roteiro em si continua');
    ok(N.cities.londres.hosp.nome === '' && N.cities.roma.custos.hospedagem.v === '', 'hospedagem e gastos em branco');
  });

  teste('Link inválido ou de versão mais nova é recusado com mensagem', async () => {
    for (const ruim of ['', 'abc', '1z!!!', '1jAAAA', '9z' + 'A'.repeat(8)]) {
      let erro = null;
      try { await Comp.decodificar(ruim); } catch (e) { erro = e; }
      ok(erro && erro.message, 'devia recusar: "' + ruim + '"');
    }
  });

  teste('Mesclar: adiciona só as cidades e os pontos que eu não tenho', () => {
    const O = JSON.parse(JSON.stringify(estadoMexido()));      // roteiro de quem compartilhou (tem Roma)
    const S = novoEstado();
    const pLondres = D.pois.find(p => p.cityId === 'londres' && !S.pois[p.id].sel);
    O.pois[pLondres.id].sel = true;
    S.cities.londres.noites = 9;
    const antes = D.cities.filter(c => S.cities[c.id].sel).length;
    const r = Comp.mesclar(S, O);
    ok(r.cidades === 1 && S.cities.roma.sel && S.cities.roma.noites === 4, 'Roma entrou com as noites do link');
    ok(D.cities.filter(c => S.cities[c.id].sel).length === antes + 1, 'nenhuma cidade saiu');
    ok(S.cities.londres.noites === 9, 'o que eu já tinha não muda');
    const rota = App.route();
    ok(rota.indexOf('roma') === rota.length - 2, 'entra antes da minha última cidade: ' + rota.join());
    ok(S.pois[pLondres.id].sel, 'ponto novo em cidade que eu já tinha');
    ok(S.customPois.some(p => p.id === 'u-teste1') && S.pois['u-teste1'].sel, 'ponto criado pela outra pessoa');
    ok(S.cities.roma.custos.hospedagem.v === '', 'valores da outra pessoa não vêm na mescla');
    igual(Comp.mesclar(S, O), { cidades: 0, pontos: 0 }, 'mesclar de novo não muda nada');
  });

  /* ------------------------------------------------------------ futebol */
  grupo('Futebol');
  const Fut = window.Futebol;

  teste('Clubes: cidade existe, links https e tour ligado a um ponto da mesma cidade', () => {
    ok(D.clubes.length >= 40, 'lista de clubes');
    const ids = {};
    D.clubes.forEach(k => {
      ok(!ids[k.id], 'id repetido: ' + k.id); ids[k.id] = true;
      ok(App.city(k.cityId), k.id + ': cidade ' + k.cityId);
      ok(/^https:\/\//.test(k.calendario) && /^https:\/\//.test(k.ingressos), k.id + ': links');
      ok(isFinite(k.lat) && isFinite(k.lon) && App.distKm(k, App.city(k.cityId)) < 30, k.id + ': estádio perto da cidade');
      if (k.poi) { const p = D.pois.find(x => x.id === k.poi); ok(p && p.cityId === k.cityId, k.id + ': tour ' + k.poi); }
    });
    igual(Fut.clubes('londres').map(k => k.id), ['arsenal', 'chelsea', 'tottenham', 'west-ham']);
    igual(Fut.clubes('cracovia').map(k => k.id), ['wisla', 'cracovia']);
    ok(Fut.clubes('paris')[0].id === 'psg' && Fut.clubes('munique')[0].id === 'bayern', 'PSG e Bayern');
    ok(Fut.clube('arsenal').poi === 'emirates-stadium', 'tour do Emirates ligado ao Arsenal');
  });

  teste('Jogo nas datas do roteiro: dentro, "chega 1 dia depois", "sai N dias antes", cidade fora', () => {
    const S = novoEstado();
    App.calc = T.compute({ leve: true });
    const seg = App.calc.segByCity.londres, dia = n => App.iso(App.addDays(seg.start, n));
    const j = (data, cityId) => ({ id: 'x', data, hora: '15:00', casa: 'Arsenal', fora: 'Chelsea', cityId: cityId || 'londres' });
    ok(S.cities.londres.noites >= 2, 'Londres com 2+ noites no padrão');
    igual(Fut.situacao(j(dia(1))).tipo, 'ok');
    igual(Fut.situacao(j(dia(0))).tipo, 'chegada');
    igual(Fut.situacao(j(dia(seg.nights))).tipo, 'saida');
    const antes = Fut.situacao(j(dia(-1)));
    ok(antes.tipo === 'antes' && !antes.ok && antes.texto === 'Você chega 1 dia depois do jogo', antes.texto);
    const depois = Fut.situacao(j(dia(seg.nights + 3)));
    ok(depois.tipo === 'depois' && depois.texto === 'Você sai 3 dias antes do jogo', depois.texto);
    igual(Fut.situacao(j(dia(1), 'madri')).tipo, 'fora');
  });

  teste('Jogos cadastrados: validação, lista por cidade, bola na linha do tempo e ponto para o orçamento', () => {
    const S = novoEstado();
    App.calc = T.compute({ leve: true });
    const d1 = App.iso(App.addDays(App.calc.segByCity.londres.start, 1));
    S.jogos.push({ id: 'j1', data: d1, hora: '17:30', casa: 'arsenal', fora: 'Chelsea', comp: 'Premier League', cityId: 'londres', ingressos: 'javascript:alert(1)' },
      { data: 'amanhã', casa: 'A', fora: 'B', cityId: 'londres' }, { data: d1, casa: 'A', fora: 'B', cityId: 'nao-existe' }, { data: d1, casa: '', fora: 'B', cityId: 'paris' });
    T.sanitize(S);
    igual(S.jogos.map(j => j.id), ['j1'], 'só o jogo válido fica');
    ok(S.jogos[0].ingressos === '', 'link que não é http(s) é descartado');
    const js = Fut.daCidade('londres');
    ok(js.length === 1 && js[0].origem === 'meu' && Fut.clubeDe(js[0]).id === 'arsenal', 'mandante reconhecido pelo nome');
    ok(Fut.tlHtml('londres', App.parseDate(d1)).html.indexOf('tl-ball') > 0 && Fut.tlHtml('londres', App.addDays(App.parseDate(d1), 1)).html === '', 'bola só no dia do jogo');
    const p = Fut.pontoDe(js[0]);
    ok(/^u-jogo-/.test(p.id) && p.cityId === 'londres' && p.lat === Fut.clube('arsenal').lat && p.tags[0] === 'Futebol', 'ponto no estádio do mandante');
    S.customPois.push(p); T.sanitize(S);
    ok(S.customPois.length === 1 && S.pois[p.id], 'o ponto do jogo é aceito como ponto do usuário (entra no orçamento)');
  });

  teste('Automático: resposta da football-data.org → jogos em casa, na hora local do estádio', () => {
    novoEstado();
    const k = Fut.clube('arsenal');
    const r = Fut.resumir({ matches: [
      { id: 1, utcDate: '2027-03-06T17:30:00Z', status: 'TIMED', competition: { name: 'Premier League' }, homeTeam: { id: 57, shortName: 'Arsenal' }, awayTeam: { id: 61, shortName: 'Chelsea' } },
      { id: 2, utcDate: '2027-03-09T20:00:00Z', status: 'TIMED', competition: { name: 'Premier League' }, homeTeam: { id: 73, shortName: 'Tottenham' }, awayTeam: { id: 57, shortName: 'Arsenal' } },
      { id: 3, utcDate: '2027-03-13T00:00:00Z', status: 'SCHEDULED', competition: { name: 'FA Cup' }, homeTeam: { id: 57, name: 'Arsenal FC' }, awayTeam: null }
    ] }, k);
    igual(r.map(j => j.id), ['a-1', 'a-3'], 'só os jogos em casa');
    ok(r[0].data === '2027-03-06' && r[0].hora === '17:30' && r[0].fora === 'Chelsea' && r[0].cityId === 'londres' && r[0].estadio === 'Emirates Stadium', JSON.stringify(r[0]));
    ok(r[1].hora === '' && r[1].fora === 'a definir', 'hora ainda não definida');
    igual(Fut.horaLocal('2027-07-10T19:00:00Z', 'Europe/Paris'), { data: '2027-07-10', hora: '21:00' });
    igual(Fut.horaLocal('2027-03-06T23:30:00Z', 'Europe/Athens'), { data: '2027-03-07', hora: '01:30' });
    igual(Fut.resumir(null, k), []);
    ok(!D.config.futebolProxyUrl, 'o proxy vem desligado por padrão (nenhuma chave no site)');
  });

  /* ------------------------------------------------------------ utilitários */
  grupo('Utilitários');

  teste('parseLatLon: links do Google Maps e texto', () => {
    const P = window.UI.parseLatLon;
    igual(P('48.8566, 2.3522'), { lat: 48.8566, lon: 2.3522 });
    igual(P('-23.5 -46.6'), { lat: -23.5, lon: -46.6 });
    igual(P('https://www.google.com/maps/place/Louvre/@48.8606,2.3376,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d48.8611!4d2.3364'), { lat: 48.8611, lon: 2.3364 });
    igual(P('https://www.google.com/maps/@51.5074,-0.1278,15z'), { lat: 51.5074, lon: -0.1278 });
    igual(P('https://www.google.com/maps/search/?api=1&query=50.0647,19.945'), { lat: 50.0647, lon: 19.945 });
    igual(P('https://maps.app.goo.gl/abc123'), null);
    igual(P('95.0, 10'), null, 'latitude inválida');
    igual(P(''), null);
  });

  /* ---------------------------------------------------------------- execução */
  async function rodar() {
    const saida = document.getElementById('saida');
    let total = 0, falhas = 0;
    for (const g of grupos) {
      const h = document.createElement('h2'); h.textContent = g.nome; saida.appendChild(h);
      const ul = document.createElement('ul'); saida.appendChild(ul);
      for (const t of g.testes) {
        const li = document.createElement('li');
        total++;
        try {
          await t.fn();
          li.className = 'ok'; li.innerHTML = '<b>✓</b><span></span>';
        } catch (e) {
          falhas++;
          li.className = 'falha'; li.innerHTML = '<b>✗</b><span></span><small></small>';
          li.querySelector('small').textContent = e && e.message ? e.message : String(e);
          console.error('Teste falhou: ' + t.nome, e);
        }
        li.querySelector('span').textContent = t.nome;
        ul.appendChild(li);
      }
    }
    const r = document.getElementById('resumo');
    r.textContent = falhas ? falhas + ' de ' + total + ' testes falharam.' : 'Todos os ' + total + ' testes passaram.';
    r.className = falhas ? 'falha' : 'ok';
    window.TESTES = { total, falhas };
  }

  /* --------------------------- verificação lenta: todos os wiki devolvem foto */
  // ~1 requisição por segundo (a Wikipedia devolve erro 429 se for mais rápido).
  document.getElementById('btn-wiki').addEventListener('click', async function () {
    const out = document.getElementById('lento-out');
    const itens = D.cities.map(c => ({ tipo: 'cidade', nome: c.nome, wiki: c.wiki }))
      .concat(D.pois.map(p => ({ tipo: 'ponto', nome: p.nome, wiki: p.wiki })));
    const ruins = [];
    this.disabled = true;
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      out.textContent = 'Conferindo ' + (i + 1) + ' de ' + itens.length + '… (' + ruins.length + ' com problema)';
      try {
        const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(it.wiki));
        const j = r.ok ? await r.json() : null;
        const src = j && ((j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source));
        if (!j) ruins.push(it.tipo + ' "' + it.nome + '" (' + it.wiki + '): HTTP ' + r.status);
        else if (j.type === 'disambiguation') ruins.push(it.tipo + ' "' + it.nome + '" (' + it.wiki + '): desambiguação');
        else if (!src) ruins.push(it.tipo + ' "' + it.nome + '" (' + it.wiki + '): sem foto');
        else if (/\.svg|logo|map|coat_of_arms|flag/i.test(decodeURIComponent(src))) ruins.push(it.tipo + ' "' + it.nome + '" (' + it.wiki + '): logotipo/mapa/brasão — ' + src);
      } catch (e) { ruins.push(it.tipo + ' "' + it.nome + '": erro de rede'); }
      await new Promise(r => setTimeout(r, 1050));
    }
    out.textContent = (ruins.length ? ruins.length + ' problema(s):\n' + ruins.join('\n') : 'Todos os ' + itens.length + ' títulos devolvem foto.');
    this.disabled = false;
  });

  rodar();
})();
