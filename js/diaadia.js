/* ==========================================================================
   diaadia.js — Feature 1: roteiro dia a dia automático.

   Distribui os pontos SELECIONADOS de cada cidade pelos dias da estadia:
     1. pontos com dia fixo (campo "dia" escolhido pelo usuário) ficam onde estão;
     2. bate-voltas longos (mais de ~4h com deslocamento) ocupam um dia inteiro;
     3. os demais são agrupados por proximidade (k-means geográfico, k = dias
        disponíveis), respeitando a capacidade de horas de cada dia e os dias
        fechados (ex.: Louvre na terça);
     4. dentro do dia, a ordem é um caminho que sai da hospedagem (ou do centro)
        e volta para ela — todas as ordens são testadas até 7 pontos; acima
        disso, vizinho mais próximo + 2-opt. Os tempos vêm da matriz a pé
        (ape.js) ou, se ela faltar, da linha reta × 1,3 a 4,8 km/h;
     5. dia com mais de ~10h de atividade recebe "dia puxado" e uma sugestão.

   planejar() é uma função pura (testada em tests/); o resto liga com o app.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const DD = window.DiaADia = {};

  // Parâmetros (editáveis em DATA.config.diaADia).
  const CFG = Object.assign({
    inicioH: 9, fimH: 19,         // dia inteiro: 9h–19h
    chegadaH: 14,                 // dia de chegada: só a tarde, a partir das 14h
    partidaH: 12,                 // dia de partida: só a manhã, até as 12h
    puxadoH: 10,                  // acima disso o dia é "puxado"
    bateVoltaLongoH: 4,           // bate-volta acima disso ocupa o dia inteiro
    folgaH: 0.3,                  // deslocamento médio por ponto, usado só para distribuir
    apeMaxMin: 35                 // acima disso o deslocamento é estimado de transporte público
  }, D.config.diaADia || {});
  DD.CFG = CFG;

  /* ====================================================== planejador (puro) */
  const km = (a, b) => {
    const R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const centro = ps => ({ lat: ps.reduce((s, p) => s + p.lat, 0) / ps.length, lon: ps.reduce((s, p) => s + p.lon, 0) / ps.length });
  // O ponto "cabe" no dia: não fecha nesse dia da semana e dá tempo de visitar antes de fechar
  // (ex.: atração que fecha às 16h30 não serve para a tarde do dia de chegada).
  const aberto = (p, d) => !(p.fechado && p.fechado.indexOf(d.dow) >= 0) &&
    (p.fecha == null || Math.max(d.ini + 0.4, p.abre || 0) + p.dur <= p.fecha + 0.1);      // 0,4 h: deslocamento até lá
  const fechaNoDia = (p, d) => !!(p.fechado && p.fechado.indexOf(d.dow) >= 0);

  // k-means geográfico simples (sementes pelo critério "ponto mais distante").
  function kmeans(ps, k) {
    k = Math.min(k, ps.length);
    const cs = [ps[0]];
    while (cs.length < k) {
      let melhor = null, dm = -1;
      ps.forEach(p => { const d = Math.min.apply(null, cs.map(c => km(c, p))); if (d > dm) { dm = d; melhor = p; } });
      cs.push(melhor);
    }
    let grupos = [];
    for (let it = 0; it < 12; it++) {
      grupos = cs.map(() => []);
      ps.forEach(p => { let g = 0; cs.forEach((c, i) => { if (km(c, p) < km(cs[g], p)) g = i; }); grupos[g].push(p); });
      grupos.forEach((g, i) => { if (g.length) cs[i] = centro(g); });
    }
    return grupos.filter(g => g.length);
  }

  // Todas as permutações (só para listas curtas).
  function permutar(xs, cb, pre) {
    pre = pre || [];
    if (!xs.length) { cb(pre); return; }
    for (let i = 0; i < xs.length; i++) permutar(xs.slice(0, i).concat(xs.slice(i + 1)), cb, pre.concat([xs[i]]));
  }

  // Simula um dia na ordem dada: horários, esperas e avisos.
  function simular(dia, ordem, desloc) {
    let t = dia.ini, pos = '_o', viol = 0, andar = 0;
    const itens = ordem.map(p => {
      const d = desloc(pos, p.id);
      let chega = t + d.min / 60, espera = 0;
      if (p.abre != null && chega < p.abre) { espera = p.abre - chega; chega = p.abre; }
      const sai = chega + p.dur;
      const tarde = p.fecha != null && sai > p.fecha + 0.01;
      if (tarde) viol++;
      andar += d.min; t = sai; pos = p.id;
      return { id: p.id, chega, sai, desloc: d, espera, tarde, fixo: !!p.fixo, longo: !!p.longo };
    });
    const volta = ordem.length ? desloc(pos, '_o') : { min: 0, modo: 'pe' };
    const fim = t + volta.min / 60;
    return { itens, volta, fim, viol, andarMin: andar + volta.min, atividadeH: ordem.length ? fim - dia.ini : 0 };
  }

  // Melhor ordem do dia: sai da origem e volta para ela.
  function ordenar(dia, ps, desloc) {
    if (ps.length <= 1) return simular(dia, ps, desloc);
    const nota = s => s.viol * 1000 + s.fim;
    let melhor = null;
    const testar = ordem => { const s = simular(dia, ordem, desloc); if (!melhor || nota(s) < nota(melhor) - 1e-9) melhor = s; };
    if (ps.length <= 7) { permutar(ps, testar); return melhor; }
    // muitos pontos: vizinho mais próximo + 2-opt sobre os tempos de deslocamento
    const t = (a, b) => desloc(a, b).min;
    let seq = [], resto = ps.slice(), pos = '_o';
    while (resto.length) { resto.sort((a, b) => t(pos, a.id) - t(pos, b.id)); const p = resto.shift(); seq.push(p); pos = p.id; }
    const custo = s => { let c = t('_o', s[0].id); for (let i = 1; i < s.length; i++) c += t(s[i - 1].id, s[i].id); return c + t(s[s.length - 1].id, '_o'); };
    let mudou = true, voltas = 0;
    while (mudou && voltas++ < 40) {
      mudou = false;
      for (let i = 0; i < seq.length - 1; i++) for (let j = i + 1; j < seq.length; j++) {
        const novo = seq.slice(0, i).concat(seq.slice(i, j + 1).reverse(), seq.slice(j + 1));
        if (custo(novo) < custo(seq) - 1e-6) { seq = novo; mudou = true; }
      }
    }
    testar(seq); testar(seq.slice().reverse());
    return melhor;
  }

  /* entrada: { dias: [{ iso, dow, ini, fim, tipo }], pontos: [{ id, lat, lon, dur, longo, fechado, fixo, abre, fecha }],
                desloc(aId, bId) → { min, modo }, cfg }
     saída:   { dias: [{ ...dia, itens, volta, fim, atividadeH, puxado, sugestao, viol }], semDia: [ids] } */
  DD.planejar = function (inp) {
    const cfg = Object.assign({}, CFG, inp.cfg || {});
    const dias = inp.dias.map(d => Object.assign({}, d, { cap: d.fim - d.ini, ps: [], bv: false }));
    const semDia = [];
    if (!dias.length) return { dias: [], semDia: inp.pontos.map(p => p.id) };
    const carga = d => d.ps.reduce((s, p) => s + p.dur + (p.longo ? 0 : cfg.folgaH), 0);
    const pontos = inp.pontos.map(p => Object.assign({}, p));

    // 1. dia fixo escolhido pelo usuário
    const resto = [];
    pontos.forEach(p => {
      const d = p.fixo ? dias.find(x => x.iso === p.fixo) : null;
      if (d) { d.ps.push(p); if (p.longo) d.bv = true; } else { p.fixo = ''; resto.push(p); }
    });

    // 2. bate-voltas longos: um dia inteiro só para cada um (de preferência um dia inteiro e vazio)
    resto.filter(p => p.longo).sort((a, b) => b.dur - a.dur).forEach(p => {
      const cands = dias.filter(d => aberto(p, d));
      const nota = d => (d.bv ? 1000 : 0) + d.ps.length * 100 - d.cap;
      const d = (cands.length ? cands : dias).slice().sort((a, b) => nota(a) - nota(b))[0];
      d.ps.push(p); d.bv = true;
    });

    // 3. demais pontos: grupos por proximidade → dias com capacidade
    const livres = resto.filter(p => !p.longo);
    let normais = dias.filter(d => !d.bv);
    if (!normais.length) normais = dias;                 // só há dias de bate-volta: divide com eles
    if (livres.length) {
      const grupos = kmeans(livres, normais.length);
      // penalidade de colocar o grupo g no dia d
      const pen = (g, d) => {
        const h = g.reduce((s, p) => s + p.dur + cfg.folgaH, 0);
        const fechados = g.filter(p => !aberto(p, d)).length;
        const longe = d.ps.length ? km(centro(g), centro(d.ps)) : 0;
        return Math.max(0, h + carga(d) - d.cap) * 10 + fechados * 100 + longe;
      };
      let melhor = null, melhorC = Infinity;
      const tentar = ordemDias => {
        let c = 0;
        grupos.forEach((g, i) => { c += pen(g, ordemDias[i]); });
        if (c < melhorC) { melhorC = c; melhor = ordemDias.slice(); }
      };
      if (normais.length <= 7) permutar(normais, tentar);
      else tentar(normais.slice().sort((a, b) => b.cap - a.cap));      // muitos dias: os maiores grupos nos maiores dias
      grupos.sort((a, b) => b.length - a.length);
      grupos.forEach((g, i) => { g.forEach(p => melhor[i].ps.push(p)); });

      // conserto: tira pontos de dias fechados e alivia dias estourados, enquanto houver melhora
      const excesso = d => Math.max(0, carga(d) - d.cap);
      const total = () => dias.reduce((s, d) => s + excesso(d) + d.ps.filter(p => !aberto(p, d)).length * 100, 0);
      for (let volta = 0; volta < 200; volta++) {
        const antes = total();
        if (antes < 1e-9) break;
        let jogada = null, ganho = 1e-9;
        normais.forEach(de => {
          const ruim = excesso(de) > 0 || de.ps.some(p => !aberto(p, de));
          if (!ruim) return;
          de.ps.forEach(p => {
            if (p.fixo || p.longo) return;
            normais.forEach(para => {
              if (para === de || !aberto(p, para)) return;
              de.ps.splice(de.ps.indexOf(p), 1); para.ps.push(p);
              const dist = para.ps.length > 1 ? km(p, centro(para.ps.filter(x => x !== p))) : 0;
              const g = antes - total() - dist * 0.01;
              if (g > ganho) { ganho = g; jogada = { p, de, para }; }
              para.ps.pop(); de.ps.push(p);
            });
          });
        });
        if (!jogada) break;
        jogada.de.ps.splice(jogada.de.ps.indexOf(jogada.p), 1); jogada.para.ps.push(jogada.p);
      }
    }

    // 4. ordem e horários de cada dia
    const out = dias.map(d => {
      const s = ordenar(d, d.ps, inp.desloc);
      return Object.assign({ iso: d.iso, dow: d.dow, ini: d.ini, fimDia: d.fim, tipo: d.tipo, cap: d.cap }, s,
        { puxado: s.atividadeH > cfg.puxadoH, fechados: d.ps.filter(p => fechaNoDia(p, d)).map(p => p.id), sugestao: null });
    });

    // 5. dia puxado: sugere mover o último ponto livre para o dia mais leve em que ele abre
    out.forEach(d => {
      if (!d.puxado) return;
      const movel = d.itens.slice().reverse().find(i => !i.fixo && !i.longo);
      if (!movel) return;
      const p = pontos.find(x => x.id === movel.id);
      const alvo = out.filter(x => x !== d && !x.puxado && aberto(p, x) && !x.itens.some(i => i.longo)).sort((a, b) => a.atividadeH - b.atividadeH)[0];
      if (alvo) d.sugestao = { id: movel.id, para: alvo.iso };
    });
    return { dias: out, semDia };
  };

  /* ============================================================ ligação com o app */
  const hh = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] + +m[2] / 60 : null; };
  const hhmm = h => window.Clima.hhmm(h);

  // Dias disponíveis da cidade: chegada (só a tarde), inteiros e partida (só a manhã).
  DD.diasDe = function (cityId) {
    const App = A(), ds = App.cityDays(cityId);
    return ds.map((d, i) => {
      const tipo = i === 0 ? 'chegada' : i === ds.length - 1 ? 'partida' : 'inteiro';
      return { iso: App.iso(d), date: d, dow: d.getUTCDay(), tipo,
        ini: tipo === 'chegada' ? CFG.chegadaH : CFG.inicioH, fim: tipo === 'partida' ? CFG.partidaH : CFG.fimH };
    });
  };

  // Deslocamento entre dois itens da cidade: a pé (matriz real ou estimativa); se for longe
  // demais para ir a pé, estimativa de transporte público.
  function deslocDe(cityId, longos) {
    return function (a, b) {
      if (a === b || longos[a] || longos[b]) return { min: 0, modo: 'incluso' };      // bate-volta: o tempo já inclui a viagem
      const w = window.Ape.entre(cityId, a, b);
      if (w.min > CFG.apeMaxMin) return { min: Math.min(w.min, 15 + w.km * 3), modo: 'transporte', km: w.km };
      return { min: w.min, modo: 'pe', km: w.km, real: w.real };
    };
  }

  const memo = {};
  // Plano da cidade (recalculado só quando algo muda).
  DD.plano = function (cityId) {
    const App = A(), S = App.state;
    if (!S.cities[cityId].sel) return null;
    const dias = DD.diasDe(cityId), longos = {};
    const pontos = App.poisOf(cityId).filter(p => App.poiActive(p.id)).map(p => {
      const dur = +p.duracaoH || 1, longo = !!p.bateVolta && dur > CFG.bateVoltaLongoH;
      if (longo) longos[p.id] = true;
      return { id: p.id, lat: p.lat, lon: p.lon, dur, longo, fechado: p.fechado || null, fixo: S.pois[p.id].dia || '',
        abre: p.horario ? hh(p.horario.abre) : null, fecha: p.horario ? hh(p.horario.fecha) : null };
    });
    const o = window.Ape.origem(cityId);
    const sig = JSON.stringify([dias.map(d => d.iso + d.ini + d.fim), pontos, o.lat, o.lon, !!window.Ape.matrizDe(cityId)]);
    if (memo[cityId] && memo[cityId].sig === sig) return memo[cityId].plano;
    const plano = DD.planejar({ dias, pontos, desloc: deslocDe(cityId, longos) });
    plano.dias.forEach((d, i) => { d.date = dias[i].date; avisosDoDia(cityId, d); });
    plano.cityId = cityId; plano.n = pontos.length;
    memo[cityId] = { sig, plano };
    return plano;
  };

  // Avisos de um dia: fechado, depois do horário, depois do pôr do sol (ao ar livre), fim tardio.
  function avisosDoDia(cityId, d) {
    const App = A(), F = window.Fmt;
    d.avisos = [];
    d.fechados.forEach(id => d.avisos.push(App.poi(id).nome + ' fecha neste dia da semana — mude o dia dele.'));
    d.itens.filter(i => i.tarde).forEach(i => d.avisos.push(App.poi(i.id).nome + ' fecha às ' + App.poi(i.id).horario.fecha + ' — a visita terminaria às ' + hhmm(i.sai) + '.'));
    const por = window.Clima.porDoSol(cityId, d.date);
    d.porDoSol = por;
    d.itens.forEach(i => {
      const p = App.poi(i.id);
      if (p.arLivre && !i.longo && i.sai > por + 0.25 && por > 0) d.avisos.push(p.nome + ' é ao ar livre e ficaria para depois do pôr do sol (' + hhmm(por) + ').');
    });
    if (d.itens.length && d.fim > d.fimDia + 0.5) d.avisos.push('A agenda vai até ' + hhmm(d.fim) + (d.tipo === 'partida' ? ', mas este é o dia da partida (só a manhã).' : '.'));
    if (d.puxado) {
      d.avisos.push('Dia puxado: ' + F.horas(d.atividadeH) + ' de atividade.' + (d.sugestao
        ? ' Sugestão: mover ' + App.poi(d.sugestao.id).nome + ' para ' + F.dow(App.parseDate(d.sugestao.para)) + ', ' + F.data(App.parseDate(d.sugestao.para)) + '.' : ''));
    }
  }

  /* ================================================================ interface */
  const esc = s => window.UI.esc(s);
  DD.sel = { cityId: null, iso: null };       // dia destacado no mapa

  // Dia escolhido para a cidade (padrão: o primeiro com pontos).
  DD.diaAtivo = function (cityId) {
    const pl = DD.plano(cityId);
    if (!pl) return null;
    if (DD.sel.cityId === cityId && pl.dias.some(d => d.iso === DD.sel.iso)) return DD.sel.iso;
    const d = pl.dias.find(x => x.itens.length) || pl.dias[0];
    return d ? d.iso : null;
  };

  const TIPO = { chegada: 'chegada · só a tarde', partida: 'partida · só a manhã', inteiro: '' };
  const deslocTxt = d => (d.modo === 'incluso' || d.min < 0.5 ? '' : (d.modo === 'transporte' ? '~' + window.Ape.fmtMin(d.min) + ' de transporte' : (d.real ? '' : '~') + window.Ape.fmtMin(d.min) + ' a pé'));

  // Seção "Dia a dia" do painel da cidade.
  DD.cityHtml = function (c) {
    const App = A(), F = window.Fmt, pl = DD.plano(c.id);
    if (!pl) return '';
    let html = '<h4>Dia a dia <small>' + pl.n + (pl.n === 1 ? ' ponto' : ' pontos') + ' em ' + pl.dias.length + ' dias</small></h4>';
    if (!pl.n) return html + '<p class="muted">Selecione pontos de interesse abaixo para montar a agenda desta cidade.</p>';
    const ativo = DD.diaAtivo(c.id), opts = pl.dias.map(d => [d.iso, F.dow(d.date) + ' ' + F.data(d.date)]);
    html += '<div class="dd">' + pl.dias.map(d => {
      const tot = d.itens.length ? F.horas(d.atividadeH) + ' · ' + hhmm(d.ini) + '–' + hhmm(d.fim) : 'livre';
      let h = '<section class="dd-day' + (d.iso === ativo ? ' on' : '') + (d.puxado ? ' heavy' : '') + '" data-dd-day="' + d.iso + '" data-city="' + c.id + '">' +
        '<button type="button" class="dd-head" data-act="dd-day" data-id="' + c.id + '" data-dia="' + d.iso + '" data-fid="dd-' + d.iso + '">' +
        '<b>' + F.dow(d.date) + ', ' + F.data(d.date) + '</b><small>' + [TIPO[d.tipo], tot].filter(Boolean).join(' · ') + '</small></button>';
      if (d.itens.length) {
        h += '<ol>' + d.itens.map((i, n) => {
          const p = App.poi(i.id), tx = deslocTxt(i.desloc);
          return (tx ? '<li class="dd-go">' + esc(tx) + (i.espera > 0.2 ? ' · espera abrir às ' + hhmm(i.chega) : '') + '</li>' : '') +
            '<li class="dd-it' + (i.tarde ? ' warn' : '') + '" draggable="true" data-dd-poi="' + esc(i.id) + '">' +
            '<span class="dd-n">' + (n + 1) + '</span><button type="button" class="dd-t" data-act="open-poi" data-id="' + esc(i.id) + '"><b>' + esc(p.nome) + '</b>' +
            '<small>' + hhmm(i.chega) + ' – ' + hhmm(i.sai) + (i.longo ? ' · bate-volta, dia inteiro' : '') + '</small></button>' +
            '<select class="dd-mv" data-dd-move="' + esc(i.id) + '" aria-label="Dia de ' + esc(p.nome) + '" title="Fixar em um dia">' +
            '<option value="">' + (i.fixo ? 'automático' : 'auto') + '</option>' +
            opts.map(o => '<option value="' + o[0] + '"' + (i.fixo && o[0] === d.iso ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></li>';
        }).join('') + (deslocTxt(d.volta) ? '<li class="dd-go">' + esc(deslocTxt(d.volta)) + ' de volta' + (App.hosp(c.id) ? ' à hospedagem' : ' ao centro') + '</li>' : '') + '</ol>';
      } else h += '<p class="dd-empty">Sem pontos — arraste um para cá ou aproveite para descansar.</p>';
      h += d.avisos.map(a => '<p class="dd-warn">' + esc(a) + '</p>').join('');
      return h + '</section>';
    }).join('') + '</div>';
    html += '<div class="links tight"><button type="button" class="btn" data-act="dd-auto" data-id="' + c.id + '" data-fid="dd-auto">Reorganizar automaticamente</button>' +
      '<button type="button" class="btn" data-act="dd-copy" data-id="' + c.id + '" data-fid="dd-copy">Copiar como texto</button></div>' +
      '<p class="muted">Arraste um ponto para outro dia (ou use o seletor) para fixá-lo; o resto se reorganiza. Horários estimados: ' +
      'chegada a partir das ' + CFG.chegadaH + 'h, dias inteiros das ' + CFG.inicioH + 'h às ' + CFG.fimH + 'h e partida até as ' + CFG.partidaH + 'h.</p>';
    return html;
  };

  // Texto simples do dia a dia (para copiar).
  DD.texto = function (cityId) {
    const App = A(), F = window.Fmt, pl = DD.plano(cityId), c = App.city(cityId);
    if (!pl) return '';
    const linhas = [c.nome.toUpperCase() + ' — dia a dia', ''];
    pl.dias.forEach(d => {
      linhas.push(F.dow(d.date) + ', ' + F.data(d.date) + (TIPO[d.tipo] ? ' (' + TIPO[d.tipo] + ')' : '') + (d.itens.length ? ' — ' + F.horas(d.atividadeH) : ' — livre'));
      d.itens.forEach((i, n) => {
        const tx = deslocTxt(i.desloc);
        linhas.push('  ' + (n + 1) + '. ' + hhmm(i.chega) + '–' + hhmm(i.sai) + '  ' + App.poi(i.id).nome + (tx ? '  (' + tx + ')' : ''));
      });
      d.avisos.forEach(a => linhas.push('  ! ' + a));
      linhas.push('');
    });
    return linhas.join('\n').trim() + '\n';
  };

  // Chips de dias sobre o mapa (com a cidade aberta).
  DD.renderChips = function () {
    const el = document.getElementById('daychips'), App = A(), f = App.focus;
    if (!el) return;
    const cid = !f ? null : f.type === 'city' ? f.id : f.type === 'poi' && App.poi(f.id) ? App.poi(f.id).cityId : null;
    const pl = cid ? DD.plano(cid) : null;
    if (!pl || !pl.n) { el.innerHTML = ''; return; }
    const ativo = DD.diaAtivo(cid), F = window.Fmt;
    el.innerHTML = '<span>Dia a dia</span>' + pl.dias.map(d => '<button type="button" class="chip' + (d.iso === ativo ? ' on' : '') + '" data-act="dd-day" data-id="' + cid +
      '" data-dia="' + d.iso + '">' + F.dow(d.date) + ' ' + F.data(d.date) + (d.itens.length ? ' · ' + d.itens.length : '') + '</button>').join('');
  };

  // Dados do trajeto para o mapa: dia ativo em destaque (numerado), os outros em cinza tracejado.
  DD.paraMapa = function () {
    const App = A(), f = App.focus;
    const cid = !f ? null : f.type === 'city' ? f.id : f.type === 'poi' && App.poi(f.id) ? App.poi(f.id).cityId : null;
    const pl = cid ? DD.plano(cid) : null;
    if (!pl || !pl.n) return null;
    const ativo = DD.diaAtivo(cid), o = window.Ape.origem(cid);
    const linha = d => [[o.lon, o.lat]].concat(d.itens.map(i => { const p = App.poi(i.id); return [p.lon, p.lat]; }), [[o.lon, o.lat]]);
    const out = { ativo: null, outros: [], nums: [] };
    pl.dias.forEach(d => {
      if (!d.itens.length) return;
      if (d.iso !== ativo) { out.outros.push(linha(d)); return; }
      // caminho real pelas ruas, se já estiver no cache (só para os trechos a pé)
      const pts = [o].concat(d.itens.filter(i => !i.longo).map(i => App.poi(i.id)), [o]);
      const real = d.itens.some(i => i.longo || i.desloc.modo === 'transporte') ? null : window.Ape.rotaNoCache(pts);
      out.ativo = real ? real.c : linha(d);
      out.real = !!real;
      d.itens.forEach((i, n) => { const p = App.poi(i.id); out.nums.push({ id: 'n' + i.id, lat: p.lat, lon: p.lon, n: n + 1 }); });
      if (!real && pts.length > 2 && !d.itens.some(i => i.longo || i.desloc.modo === 'transporte')) {
        window.Ape.rota(pts).then(r => { if (r) window.MapView.update(); });      // busca uma vez; o cache evita repetir
      }
    });
    return out;
  };

  function selecionar(cityId, iso) {
    DD.sel = { cityId, iso };
    window.Ape.limpar();
    window.UI.renderAll();
    window.MapView.update();
  }
  DD.selecionar = selecionar;

  function fixar(id, iso) {
    const App = A(), ps = App.state.pois[id];
    if (!ps) return;
    ps.dia = iso || '';
    if (iso) DD.sel = { cityId: App.poi(id).cityId, iso };
    App.refresh();
  }

  DD.bind = function () {
    const UI = window.UI, App = A();
    UI.actions['dd-day'] = (t, id) => selecionar(id, t.dataset.dia);
    UI.actions['dd-auto'] = (t, id) => {
      let n = 0;
      App.poisOf(id).forEach(p => { if (App.state.pois[p.id].dia) { App.state.pois[p.id].dia = ''; n++; } });
      App.refresh();
      UI.toast(n ? 'Agenda reorganizada (' + n + (n > 1 ? ' dias fixos liberados).' : ' dia fixo liberado).') : 'Agenda reorganizada.');
    };
    UI.actions['dd-copy'] = (t, id) => {
      const txt = DD.texto(id);
      const ok = () => UI.toast('Dia a dia copiado para a área de transferência.');
      const manual = () => {              // sem API de clipboard (file:// em alguns navegadores): área de texto temporária
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { UI.toast('Não foi possível copiar automaticamente.'); }
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, manual); else manual();
    };
    // seletor de dia de cada ponto
    document.addEventListener('change', e => {
      const t = e.target;
      if (t && t.dataset && t.dataset.ddMove) fixar(t.dataset.ddMove, t.value);
    });
    // arrastar um ponto para outro dia
    let arrastando = null;
    const dia = el => (el && el.closest ? el.closest('[data-dd-day]') : null);
    document.addEventListener('dragstart', e => {
      const li = e.target.closest ? e.target.closest('[data-dd-poi]') : null;
      if (!li) return;
      arrastando = li.dataset.ddPoi;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', arrastando); } catch (err) { /* ok */ }
    });
    document.addEventListener('dragover', e => {
      const d = arrastando && dia(e.target);
      if (!d) return;
      e.preventDefault();
      document.querySelectorAll('.dd-day.drop').forEach(x => x.classList.remove('drop'));
      d.classList.add('drop');
    });
    document.addEventListener('drop', e => {
      const d = arrastando && dia(e.target);
      if (!d) return;
      e.preventDefault();
      const id = arrastando; arrastando = null;
      fixar(id, d.dataset.ddDay);
      UI.toast(App.poi(id).nome + ' fixado em ' + window.Fmt.data(App.parseDate(d.dataset.ddDay)) + '; o resto foi reorganizado.');
    });
    document.addEventListener('dragend', () => { arrastando = null; document.querySelectorAll('.dd-day.drop').forEach(x => x.classList.remove('drop')); });
  };
})();
