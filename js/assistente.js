/* ==========================================================================
   assistente.js — Feature 2: "Tenho X dias e R$ Y: o que cabe?"

   Monta o roteiro inteiro: QUAIS cidades, em que ORDEM, quantas NOITES em
   cada uma e TREM/ÔNIBUS/BALSA/AVIÃO em cada trecho, maximizando o interesse
   (estrelas) dentro do prazo e do orçamento. É o "problema do orientador"
   com escolha de modo de transporte — com dezenas de cidades candidatas, a
   enumeração completa é impossível, então usamos uma metaheurística
   (simulated annealing com busca local), com tempo limitado.

   A busca roda fora da thread principal, em um Web Worker criado a partir de
   um Blob (new Worker('arquivo.js') não funciona em file://). Sem Worker, roda
   em blocos com setTimeout e mostra a barra de progresso.

   Modelo de custo: diárias da cidade (hospedagem + gastos por dia, editáveis no
   painel da cidade) × noites + pontos selecionados da cidade + trechos + itens
   gerais. Trechos longos consomem parte do dia de quem chega.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const As = window.Assistente = {};

  /* =====================================================================
     NÚCLEO PURO — estas duas funções não usam nada de fora (nem variáveis
     deste arquivo): o texto delas é copiado para dentro do Web Worker.
     ===================================================================== */

  /* Avalia um roteiro. prob: veja As.problema(). ordem: índices das cidades; noites: mesma ordem.
     wH: quanto vale 1 hora de deslocamento, em reais (define o modo escolhido em cada trecho). */
  function avaliar(prob, ordem, noites, wH) {
    var n = ordem.length, custo = 0, horas = 0, interesse = 0, totalNoites = 0, modos = [], i, k;
    for (i = 0; i < n; i++) {
      var c = ordem[i], hChegada = 0;
      if (i > 0) {
        var ops = prob.legs[ordem[i - 1]][c], melhor = null;
        for (k = 0; k < ops.length; k++) if (!melhor || ops[k][1] + wH * ops[k][0] < melhor[1] + wH * melhor[0]) melhor = ops[k];
        if (!melhor) melhor = [48, 99999, 3];               // sem ligação conhecida: caro e demorado
        custo += melhor[1]; horas += melhor[0]; hChegada = melhor[0]; modos.push(melhor[2]);
      }
      totalNoites += noites[i];
      custo += noites[i] * prob.custoNoite[c] + prob.custoFixo[c];
      // dias "úteis": cada troca de cidade custa cerca de um terço de dia (malas, check-in) e o
      // trecho de chegada consome mais um pedaço (12 h de viagem = 1 dia perdido)
      var uteis = Math.max(0.2, noites[i] - 0.35 - hChegada / 12);
      // retorno decrescente: a cidade rende menos a cada noite além do "ideal"
      interesse += Math.pow(prob.estrelas[c], 1.5) * (1 - Math.exp(-uteis / prob.ideal[c])) / (1 - Math.exp(-1));
    }
    if (n) horas += prob.hIda[ordem[0]] + prob.hVolta[ordem[n - 1]];
    return { custo: custo, horas: horas, interesse: interesse, noites: totalNoites, modos: modos };
  }

  /* Procura o melhor roteiro. objetivo: 'interesse' | 'barata' | 'equilibrada'.
     opts: { ms: tempo limite, semente, minInteresse (para 'barata'), inicial: { ordem, noites } }
     Devolve { ordem, noites, modos, custo, horas, interesse, noitesTotal, viavel, iter }. */
  function otimizar(prob, objetivo, opts, avaliar) {
    opts = opts || {};
    var N = prob.n, s = (opts.semente || 12345) >>> 0;
    var rnd = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    var ri = function (k) { return Math.floor(rnd() * k); };
    var wH = objetivo === 'interesse' ? 150 : objetivo === 'barata' ? 5 : 45;
    var agora = function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); };

    var nota = function (ordem, noites) {
      var r = avaliar(prob, ordem, noites, wH), pen = 0, i, tem = {};
      for (i = 0; i < ordem.length; i++) tem[ordem[i]] = 1;
      if (r.noites > prob.N) pen += 50 + 30 * (r.noites - prob.N);
      if (r.custo > prob.orcamento) pen += 50 + 400 * (r.custo - prob.orcamento) / Math.max(prob.orcamento, 1);
      for (i = 0; i < N; i++) if (prob.obrig[i] && !tem[i]) pen += 500;
      if (!ordem.length) pen += 1000;
      r.viavel = pen === 0;
      var base = objetivo === 'interesse' ? r.interesse
        : objetivo === 'barata' ? -r.custo / Math.max(prob.orcamento, 1) * 40 - Math.max(0, (opts.minInteresse || 0) - r.interesse) * 30
        : r.interesse * (1 - 0.55 * Math.min(1.5, r.custo / Math.max(prob.orcamento, 1)));
      if (objetivo === 'barata' && r.interesse < (opts.minInteresse || 0) - 1e-9) r.viavel = false;
      r.nota = base - pen;
      return r;
    };

    // candidatas (não proibidas) e pontas fixas
    var cand = [], i;
    for (i = 0; i < N; i++) if (!prob.proib[i] && prob.estrelas[i] > 0) cand.push(i);
    var pri = prob.primeiro, ult = prob.ultimo;
    var fixoIni = pri >= 0 ? 1 : 0;
    var livreFim = function (ordem) { return ordem.length - (ult >= 0 && ordem.length > fixoIni ? 1 : 0); };   // posições [fixoIni, livreFim) são móveis

    // ponto de partida: o roteiro recebido, ou pontas + obrigatórias
    var ordem = [], noites = [];
    if (opts.inicial && opts.inicial.ordem.length) { ordem = opts.inicial.ordem.slice(); noites = opts.inicial.noites.slice(); }
    else {
      if (pri >= 0) { ordem.push(pri); noites.push(prob.nMin); }
      for (i = 0; i < N; i++) if (prob.obrig[i] && i !== pri && i !== ult) { ordem.push(i); noites.push(prob.nMin); }
      if (ult >= 0 && ult !== pri) { ordem.push(ult); noites.push(prob.nMin); }
      if (!ordem.length && cand.length) { ordem.push(cand[ri(cand.length)]); noites.push(prob.nMin); }
    }
    for (i = 0; i < noites.length; i++) noites[i] = Math.max(prob.nMin, Math.min(prob.nMax, noites[i]));

    var atual = nota(ordem, noites), melhor = { ordem: ordem.slice(), noites: noites.slice(), r: atual };
    var t0 = agora(), limite = opts.ms || 800, iter = 0, T0 = 3, T = T0;

    while (true) {
      if ((iter & 63) === 0) {
        var dt = agora() - t0;
        if (dt >= limite || (opts.maxIter && iter >= opts.maxIter)) break;
        T = T0 * Math.pow(0.002, Math.min(1, dt / limite)) ;        // resfriamento pelo tempo
        if (opts.maxIter) T = T0 * Math.pow(0.002, iter / opts.maxIter);
      }
      iter++;
      var o2 = ordem.slice(), n2 = noites.slice(), m = rnd(), a, b, fim = livreFim(o2), tem = {};
      for (i = 0; i < o2.length; i++) tem[o2[i]] = 1;

      if (m < 0.22) {                                   // incluir uma cidade na melhor posição
        var fora = [];
        for (i = 0; i < cand.length; i++) if (!tem[cand[i]]) fora.push(cand[i]);
        if (!fora.length) continue;
        // sorteio com preferência pelas mais interessantes
        var c = fora[ri(fora.length)], c2 = fora[ri(fora.length)];
        if (prob.estrelas[c2] > prob.estrelas[c]) c = c2;
        var melhorPos = -1, melhorN = -1e18;
        for (a = fixoIni; a <= fim; a++) {
          var o3 = o2.slice(0, a).concat([c], o2.slice(a)), n3 = n2.slice(0, a).concat([prob.nMin], n2.slice(a));
          var v = nota(o3, n3).nota;
          if (v > melhorN) { melhorN = v; melhorPos = a; }
        }
        if (melhorPos < 0) continue;
        o2.splice(melhorPos, 0, c); n2.splice(melhorPos, 0, prob.nMin);
      } else if (m < 0.36) {                            // tirar uma cidade
        if (fim - fixoIni < 1) continue;
        a = fixoIni + ri(fim - fixoIni);
        if (prob.obrig[o2[a]]) continue;
        o2.splice(a, 1); n2.splice(a, 1);
      } else if (m < 0.58) {                            // uma noite a mais ou a menos
        if (!o2.length) continue;
        a = ri(o2.length);
        n2[a] += rnd() < 0.5 ? 1 : -1;
        if (n2[a] < prob.nMin || n2[a] > prob.nMax) continue;
      } else if (m < 0.70) {                            // passar uma noite de uma cidade para outra
        if (o2.length < 2) continue;
        a = ri(o2.length); b = ri(o2.length);
        if (a === b || n2[a] <= prob.nMin || n2[b] >= prob.nMax) continue;
        n2[a]--; n2[b]++;
      } else if (m < 0.82) {                            // 2-opt: inverter um pedaço da ordem
        if (fim - fixoIni < 2) continue;
        a = fixoIni + ri(fim - fixoIni); b = fixoIni + ri(fim - fixoIni);
        if (a === b) continue;
        if (a > b) { var t = a; a = b; b = t; }
        o2 = o2.slice(0, a).concat(o2.slice(a, b + 1).reverse(), o2.slice(b + 1));
        n2 = n2.slice(0, a).concat(n2.slice(a, b + 1).reverse(), n2.slice(b + 1));
      } else if (m < 0.92) {                            // mudar uma cidade de lugar
        if (fim - fixoIni < 2) continue;
        a = fixoIni + ri(fim - fixoIni);
        var cc = o2.splice(a, 1)[0], nn = n2.splice(a, 1)[0];
        b = fixoIni + ri(livreFim(o2) - fixoIni + 1);
        o2.splice(b, 0, cc); n2.splice(b, 0, nn);
      } else {                                          // trocar uma cidade por outra de fora
        if (fim - fixoIni < 1) continue;
        a = fixoIni + ri(fim - fixoIni);
        if (prob.obrig[o2[a]]) continue;
        var f2 = [];
        for (i = 0; i < cand.length; i++) if (!tem[cand[i]]) f2.push(cand[i]);
        if (!f2.length) continue;
        o2[a] = f2[ri(f2.length)];
      }

      var r2 = nota(o2, n2), d = r2.nota - atual.nota;
      if (d >= 0 || rnd() < Math.exp(d / T)) {
        ordem = o2; noites = n2; atual = r2;
        if (r2.nota > melhor.r.nota) melhor = { ordem: o2.slice(), noites: n2.slice(), r: r2 };
      }
    }
    var R = melhor.r;
    return { ordem: melhor.ordem, noites: melhor.noites, modos: R.modos, custo: R.custo, horas: R.horas, interesse: R.interesse,
      noitesTotal: R.noites, viavel: R.viavel, iter: iter };
  }

  // As três alternativas, em sequência (roda no Worker ou na thread principal).
  function tresAlternativas(prob, ms, otimizar, avaliar, progresso) {
    var a = otimizar(prob, 'interesse', { ms: ms, semente: 11 }, avaliar);
    if (progresso) progresso(1);
    // "mais barata": o menor custo que ainda entrega boa parte do interesse da primeira
    var b = otimizar(prob, 'barata', { ms: ms, semente: 23, minInteresse: a.interesse * 0.6, inicial: a }, avaliar);
    if (progresso) progresso(2);
    var c = otimizar(prob, 'equilibrada', { ms: ms, semente: 37, inicial: a }, avaliar);
    if (progresso) progresso(3);
    return { interesse: a, barata: b, equilibrada: c };
  }

  As.avaliar = avaliar;
  As.otimizar = (prob, objetivo, opts) => otimizar(prob, objetivo, opts, avaliar);

  /* ============================================================ montagem do problema */
  const MODO_IDX = ['trem', 'onibus', 'balsa', 'aviao'];

  // Diária estimada da cidade em reais (hospedagem + gastos), com os valores editados pelo usuário.
  As.diaria = function (cityId) {
    const App = A(), c = App.city(cityId), d = (App.state.cities[cityId].diaria) || {};
    const hosp = d.hosp !== '' && d.hosp != null ? App.num(d.hosp) : c.diariaHospedagem;
    const gastos = d.gastos !== '' && d.gastos != null ? App.num(d.gastos) : c.diariaGastos;
    return { hosp, gastos, brl: App.toBRL(hosp + gastos, c.moeda) };
  };

  // Padrão: 3 estrelas (4 para as cidades do roteiro original do data.js).
  As.estrelas = id => { const v = A().state.interesse[id]; return v == null ? (A().city(id).selecionada ? 4 : 3) : v; };

  // Monta o problema a partir do estado do app.
  As.problema = function () {
    const App = A(), S = App.state, cfg = S.assist, T = App._t;
    const cidades = D.cities, n = cidades.length, idx = {};
    cidades.forEach((c, i) => { idx[c.id] = i; });
    const legs = cidades.map(a => cidades.map(b => {
      if (a === b) return [];
      const def = T.legDef(a.id, b.id).def, ops = [];
      MODO_IDX.forEach((m, k) => {
        const o = def[m];
        if (!o) return;
        const h = (o.h[0] + o.h[o.h.length - 1]) / 2 + (m === 'aviao' ? D.estimativa.aviaoExtraH : 0);
        const brl = App.toBRL((o.eur[0] + o.eur[1]) / 2, 'EUR') + (o.pernoite ? App.toBRL(D.config.hospedagemPernoite.v, D.config.hospedagemPernoite.cur) : 0);
        ops.push([h, brl, k]);
      });
      return ops;
    }));
    const voo = (c, sentido) => { const v = D.origem.voos[sentido][c.id] || D.origem.voos.generico; return (v.h[0] + v.h[1]) / 2; };
    let gerais = 0;
    D.gerais.forEach(g => { gerais += App.toBRL(S.gerais[g.id].v, S.gerais[g.id].cur); });
    const rota = App.calc.route, pontas = cfg.pontas && rota.length >= 1;
    const dias = Math.max(2, Math.round(App.num(cfg.dias)) || As.diasAtuais());
    const orc = App.num(cfg.orcamento) || App.num(S.orcamento);
    return {
      n, ids: cidades.map(c => c.id), legs,
      estrelas: cidades.map(c => As.estrelas(c.id)),
      ideal: cidades.map(c => Math.max(1, c.noites || 2)),
      custoNoite: cidades.map(c => As.diaria(c.id).brl),
      custoFixo: cidades.map(c => App.poisOf(c.id).reduce((s, p) => {
        const ps = S.pois[p.id];
        return s + (ps && ps.sel ? App.toBRL(ps.valor.v, ps.valor.cur) + (ps.transporte ? App.toBRL(ps.transporte.v, ps.transporte.cur) : 0) : 0);
      }, 0)),
      hIda: cidades.map(c => voo(c, 'ida')), hVolta: cidades.map(c => voo(c, 'volta')),
      N: Math.max(1, dias - 1 - D.config.noitesVooIda),           // noites em terra
      dias, orcamento: Math.max(0, orc - gerais), orcamentoTotal: orc, gerais,
      nMin: Math.max(1, Math.round(App.num(cfg.nMin)) || 1), nMax: Math.max(1, Math.round(App.num(cfg.nMax)) || 5),
      obrig: cidades.map(c => cfg.obrig.indexOf(c.id) >= 0), proib: cidades.map(c => cfg.proib.indexOf(c.id) >= 0),
      primeiro: pontas ? idx[rota[0]] : -1, ultimo: pontas && rota.length > 1 ? idx[rota[rota.length - 1]] : -1
    };
  };

  As.diasAtuais = () => { const c = A().calc; return c.segs.length ? Math.round((c.segs[c.segs.length - 1].start - c.segs[0].start) / 86400000) + 1 : 12; };

  // O roteiro atual avaliado pelo mesmo modelo (para mostrar a diferença).
  As.atual = function (prob) {
    const App = A(), S = App.state, rota = App.calc.route;
    const ordem = rota.map(id => prob.ids.indexOf(id)), noites = rota.map(id => S.cities[id].noites);
    return Object.assign(avaliar(prob, ordem, noites, 45), { ordem, noites });
  };

  /* ============================================================== execução */
  let estado = { status: '', prog: 0, res: null, prob: null, atual: null };
  let worker = null;
  As.undo = null;          // estado anterior, para "Desfazer"
  As.previa = null;        // alternativa mostrada no mapa

  function avisar() { if (A().calc) window.UI.renderAll(); }

  function terminar(res, prob) {
    estado = { status: 'ok', prog: 3, res, prob, atual: As.atual(prob) };
    avisar();
  }

  As.rodar = function () {
    const prob = As.problema(), ms = 800;
    estado = { status: 'rodando', prog: 0, res: null, prob, atual: null };
    As.previa = null;
    avisar();
    if (worker) { worker.terminate(); worker = null; }
    try {
      // Worker a partir de um Blob: funciona em file:// e no GitHub Pages
      const fonte = 'var avaliar = ' + avaliar.toString() + ';\nvar otimizar = ' + otimizar.toString() + ';\nvar tres = ' + tresAlternativas.toString() + ';\n' +
        'onmessage = function (e) { var r = tres(e.data.prob, e.data.ms, otimizar, avaliar, function (p) { postMessage({ prog: p }); }); postMessage({ res: r }); };';
      const url = URL.createObjectURL(new Blob([fonte], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = e => {
        if (e.data.prog) { estado.prog = e.data.prog; barra(); }
        if (e.data.res) { worker.terminate(); worker = null; URL.revokeObjectURL(url); terminar(e.data.res, prob); }
      };
      worker.onerror = () => { worker = null; emBlocos(prob, ms); };
      worker.postMessage({ prob, ms });
    } catch (e) { emBlocos(prob, ms); }
  };

  // Sem Worker: uma alternativa por vez, com setTimeout entre elas (a tela respira e a barra anda).
  function emBlocos(prob, ms) {
    const res = {};
    const passo = (nome, opts, prox) => setTimeout(() => {
      res[nome] = otimizar(prob, nome, opts(), avaliar);
      estado.prog++; barra();
      prox();
    }, 30);
    passo('interesse', () => ({ ms, semente: 11 }), () =>
      passo('barata', () => ({ ms, semente: 23, minInteresse: res.interesse.interesse * 0.6, inicial: res.interesse }), () =>
        passo('equilibrada', () => ({ ms, semente: 37, inicial: res.interesse }), () => terminar(res, prob))));
  }

  function barra() {
    const el = document.getElementById('as-bar');
    if (el) el.style.width = (estado.prog / 3 * 100) + '%';
  }

  /* ================================================================ aplicar */
  As.aplicar = function (nome) {
    const App = A(), S = App.state, alt = estado.res && estado.res[nome], prob = estado.prob;
    if (!alt) return;
    const nomes = alt.ordem.map(i => App.city(prob.ids[i]).nome).join(' → ');
    if (!window.confirm('Aplicar este roteiro?\n\n' + nomes + '\n\nAs cidades, a ordem, as noites e os meios de transporte atuais serão substituídos (dá para desfazer).')) return;
    As.undo = JSON.parse(JSON.stringify(S));
    As.aplicarEm(S, alt, prob);
    As.previa = null;
    App.refresh();
    window.MapView.fitRoute();
    window.UI.toast('Roteiro aplicado.', 9000, { rotulo: 'Desfazer', fn: As.desfazer });
  };

  // Escreve uma alternativa no estado (usado também para salvar como cenário).
  As.aplicarEm = function (S, alt, prob) {
    const T = A()._t;
    D.cities.forEach(c => { S.cities[c.id].sel = false; });
    alt.ordem.forEach((i, k) => {
      const id = prob.ids[i];
      S.cities[id].sel = true; S.cities[id].ordem = k + 1; S.cities[id].noites = alt.noites[k];
      if (k > 0) {
        const key = T.legDef(prob.ids[alt.ordem[k - 1]], id).key;
        S.legs[key] = Object.assign({}, S.legs[key], { modo: MODO_IDX[alt.modos[k - 1]] });
      }
    });
    S.otim.auto = false;         // mantém a ordem escolhida pelo assistente
  };

  As.desfazer = function () {
    const App = A();
    if (!As.undo) return;
    App.state = As.undo; As.undo = null;
    window.MapView.rebuildPois();
    App.refresh();
    window.MapView.fitRoute();
    window.UI.toast('Roteiro anterior restaurado.');
  };

  /* ================================================================ interface */
  const esc = s => window.UI.esc(s);
  const TITULOS = { interesse: ['Mais interesse', 'o máximo de estrelas dentro do prazo e do orçamento'],
    barata: ['Mais barata', 'gasta o mínimo mantendo boa parte do interesse'], equilibrada: ['Equilibrada', 'bom interesse por real gasto'] };

  function estrelasHtml(id) {
    const v = As.estrelas(id);
    return '<span class="stars" role="group" aria-label="Interesse">' + [1, 2, 3, 4, 5].map(n =>
      '<button type="button" class="' + (n <= v ? 'on' : '') + '" data-act="as-star" data-id="' + id + '" data-n="' + n + '" aria-label="' + n + (n > 1 ? ' estrelas' : ' estrela') + '">★</button>').join('') + '</span>';
  }

  function linhaCidade(c) {
    const cfg = A().state.assist, ob = cfg.obrig.indexOf(c.id) >= 0, pr = cfg.proib.indexOf(c.id) >= 0;
    return '<li class="as-city' + (pr ? ' off' : '') + '" data-busca="' + esc((c.nome + ' ' + c.pais).toLowerCase()) + '"><span class="as-n"><b>' + esc(c.nome) + '</b><small>' + esc(c.pais) + '</small></span>' +
      estrelasHtml(c.id) +
      '<button type="button" class="as-tg' + (ob ? ' on' : '') + '" data-act="as-obrig" data-id="' + c.id + '" title="Cidade obrigatória" aria-pressed="' + ob + '">obrig.</button>' +
      '<button type="button" class="as-tg' + (pr ? ' on' : '') + '" data-act="as-proib" data-id="' + c.id + '" title="Não incluir esta cidade" aria-pressed="' + pr + '">não</button></li>';
  }

  function cartao(nome) {
    const App = A(), F = window.Fmt, alt = estado.res[nome], prob = estado.prob, at = estado.atual, UI = window.UI;
    const total = alt.custo + prob.gerais, totalAt = at.custo + prob.gerais;
    const cont = [0, 0, 0, 0];
    alt.modos.forEach(m => { cont[m]++; });
    const modos = MODO_IDX.map((m, k) => (cont[k] ? UI.icon(m) + cont[k] : '')).filter(Boolean).join(' ');
    return '<article class="as-card' + (As.previa === nome ? ' on' : '') + '"><h5>' + TITULOS[nome][0] + '</h5><small>' + TITULOS[nome][1] + '</small>' +
      (alt.viavel ? '' : '<p class="dd-warn">Não coube no prazo ou no orçamento: este é o mais próximo que deu.</p>') +
      '<ol>' + alt.ordem.map((i, k) => '<li><span>' + esc(App.city(prob.ids[i]).nome) + '</span><b>' + alt.noites[k] + (alt.noites[k] > 1 ? ' noites' : ' noite') + '</b></li>').join('') + '</ol>' +
      '<dl><dt>Custo estimado</dt><dd>' + F.brl(total) + '</dd><dt>Dias</dt><dd>' + (alt.noitesTotal + 1 + D.config.noitesVooIda) + ' de ' + prob.dias + '</dd>' +
      '<dt>Deslocamento</dt><dd>' + F.horas(alt.horas) + '</dd><dt>Trechos</dt><dd class="as-m">' + (modos || '—') + '</dd>' +
      '<dt>Interesse</dt><dd>' + alt.interesse.toFixed(1).replace('.', ',') + '</dd></dl>' +
      '<p class="as-diff">vs. roteiro atual: ' + F.sinal(total - totalAt, F.brl) + ' · ' + F.sinal(alt.noitesTotal - at.noites, v => v + (v > 1 ? ' noites' : ' noite')) + ' · interesse ' +
      F.sinal(alt.interesse - at.interesse, v => v.toFixed(1).replace('.', ',')) + '</p>' +
      '<div class="btn-col"><button type="button" class="btn sm" data-act="as-prev" data-n="' + nome + '">' + (As.previa === nome ? 'Ocultar do mapa' : 'Ver no mapa') + '</button>' +
      '<button type="button" class="btn sm primary" data-act="as-apply" data-n="' + nome + '">Aplicar este roteiro</button>' +
      (window.Cenarios ? '<button type="button" class="btn sm" data-act="as-save" data-n="' + nome + '">Salvar como cenário</button>' : '') + '</div></article>';
  }

  // Aba "Assistente".
  As.html = function () {
    const App = A(), S = App.state, cfg = S.assist, rota = App.calc.route;
    let html = '<p class="as-lead">Tenho <input type="number" min="2" max="120" data-fid="as-dias" data-path="assist.dias" placeholder="' + As.diasAtuais() + '" value="' + esc(cfg.dias) + '" aria-label="Dias de viagem"> dias e R$ ' +
      '<input type="number" min="0" step="500" data-fid="as-orc" data-path="assist.orcamento" placeholder="' + esc(S.orcamento) + '" value="' + esc(cfg.orcamento) + '" aria-label="Orçamento total">: o que cabe?</p>' +
      '<div class="as-opts"><label>Noites por cidade: de <input type="number" min="1" max="10" data-fid="as-min" data-path="assist.nMin" value="' + esc(cfg.nMin) + '" aria-label="Mínimo de noites"> a ' +
      '<input type="number" min="1" max="15" data-fid="as-max" data-path="assist.nMax" value="' + esc(cfg.nMax) + '" aria-label="Máximo de noites"></label></div>' +
      '<label class="check"><input type="checkbox" data-fid="as-pontas" data-path="assist.pontas"' + (cfg.pontas ? ' checked' : '') + '><span>Manter as pontas fixas <small>(chegada e partida dos voos internacionais' +
      (rota.length ? ': ' + esc(App.city(rota[0]).nome) + (rota.length > 1 ? ' e ' + esc(App.city(rota[rota.length - 1]).nome) : '') : '') + ')</small></span></label>';

    html += '<button type="button" class="btn primary wide" data-act="as-run" data-fid="as-run"' + (estado.status === 'rodando' ? ' disabled' : '') + '>' +
      (estado.status === 'rodando' ? 'Montando roteiros…' : 'Montar 3 roteiros') + '</button>';
    if (estado.status === 'rodando') html += '<div class="progress as-prog"><div id="as-bar" style="width:' + (estado.prog / 3 * 100) + '%"></div></div>';
    if (As.undo) html += '<button type="button" class="btn wide as-undo" data-act="as-undo">↩ Desfazer o roteiro aplicado</button>';

    if (estado.status === 'ok') {
      html += '<h4>Alternativas <small>role para o lado · ' + estado.prob.dias + ' dias · ' + window.Fmt.brl(estado.prob.orcamentoTotal) + '</small></h4>' +
        '<div class="as-cards">' + ['interesse', 'barata', 'equilibrada'].map(cartao).join('') + '</div>' +
        '<p class="muted">Custo estimado = diárias de cada cidade × noites + pontos selecionados + trechos + itens gerais (' + window.Fmt.brl(estado.prob.gerais) +
        '). As diárias podem ser ajustadas no painel de cada cidade.</p>';
    }

    // notas de interesse: cidades do roteiro e grandes primeiro; o resto recolhido
    const prim = D.cities.filter(c => S.cities[c.id].sel || c.grande), resto = D.cities.filter(c => prim.indexOf(c) < 0).sort((a, b) => a.pais.localeCompare(b.pais, 'pt-BR'));
    html += '<h4>Interesse por cidade <small>estrelas · obrigatória · não incluir</small></h4>' +
      '<input type="text" data-fid="as-busca" data-filtro-as placeholder="Buscar cidade ou país…" autocomplete="off" value="' + esc(As.busca || '') + '">' +
      '<ul class="as-list" id="as-list">' + prim.map(linhaCidade).join('') + '</ul>' +
      '<details class="more"' + (As.aberto || As.busca ? ' open' : '') + ' data-keep="as-mais"><summary>Mais cidades (' + resto.length + ')</summary><ul class="as-list" id="as-list2">' + resto.map(linhaCidade).join('') + '</ul></details>' +
      '<p class="muted">As cidades começam com 3 estrelas (4 nas do roteiro original). Quanto mais estrelas, mais o assistente tenta incluir a cidade e ficar mais noites nela.</p>';
    return html;
  };

  // Campos de diária no painel da cidade.
  As.cityHtml = function (c) {
    const d = (A().state.cities[c.id].diaria) || {}, v = As.diaria(c.id), F = window.Fmt;
    const campo = (rot, k, padrao) => '<div class="field"><label for="f-di-' + k + '-' + c.id + '">' + rot + ' <small>padrão ' + F.moeda(padrao, c.moeda) + '</small></label>' +
      '<input type="number" min="0" step="any" inputmode="decimal" id="f-di-' + k + '-' + c.id + '" data-fid="f-di-' + k + '-' + c.id + '" data-path="cities.' + c.id + '.diaria.' + k + '" placeholder="' + padrao + '" value="' + esc(d[k] == null ? '' : d[k]) + '"></div>';
    return '<details class="more" data-keep="as-diaria"' + (As.diariaAberta ? ' open' : '') + '><summary>Estimativas por dia para o assistente <small>≈ ' + F.brl(v.brl) + ' por noite</small></summary>' +
      '<div class="rates two">' + campo('Hospedagem / noite (' + c.moeda + ')', 'hosp', c.diariaHospedagem) + campo('Gastos / dia (' + c.moeda + ')', 'gastos', c.diariaGastos) + '</div>' +
      '<p class="muted">Usadas só pelo assistente “o que cabe?”. O total da viagem continua vindo dos gastos que você digitar acima.</p></details>';
  };

  // Rota de prévia para o mapa (cinza tracejado sobre a atual).
  As.rotaPrevia = function () {
    if (!As.previa || !estado.res) return null;
    const alt = estado.res[As.previa];
    return alt.ordem.map(i => estado.prob.ids[i]);
  };

  As.resultado = () => estado;

  function filtrar() {
    const q = (As.busca || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    document.querySelectorAll('.as-city').forEach(li => {
      li.hidden = !!q && li.dataset.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) < 0;
    });
    const det = document.querySelector('[data-keep="as-mais"]');
    if (det && q) det.open = true;
  }
  As.filtrar = filtrar;

  As.bind = function () {
    const UI = window.UI, App = A();
    const alternar = (lista, id) => { const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else lista.push(id); };
    UI.actions['as-run'] = () => As.rodar();
    UI.actions['as-star'] = (t, id) => { const n = +t.dataset.n; App.state.interesse[id] = As.estrelas(id) === n && n === 1 ? 0 : n; App.refresh(); };
    UI.actions['as-obrig'] = (t, id) => { const c = App.state.assist; alternar(c.obrig, id); c.proib = c.proib.filter(x => x !== id); App.refresh(); };
    UI.actions['as-proib'] = (t, id) => { const c = App.state.assist; alternar(c.proib, id); c.obrig = c.obrig.filter(x => x !== id); App.refresh(); };
    UI.actions['as-prev'] = t => { As.previa = As.previa === t.dataset.n ? null : t.dataset.n; UI.renderAll(); window.MapView.update(); if (As.previa) window.MapView.reset(); };
    UI.actions['as-apply'] = t => As.aplicar(t.dataset.n);
    UI.actions['as-undo'] = () => As.desfazer();
    document.addEventListener('input', e => { if (e.target && e.target.dataset && 'filtroAs' in e.target.dataset) { As.busca = e.target.value; filtrar(); } });
    document.addEventListener('toggle', e => {
      const k = e.target && e.target.dataset ? e.target.dataset.keep : '';
      if (k === 'as-mais') As.aberto = e.target.open;
      if (k === 'as-diaria') As.diariaAberta = e.target.open;
    }, true);
  };
})();
