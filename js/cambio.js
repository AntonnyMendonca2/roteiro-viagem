/* ==========================================================================
   cambio.js — Feature 5: câmbio atualizado automaticamente.

   Fonte: Frankfurter (cotações de referência do Banco Central Europeu), sem
   chave. A base é EUR; aqui tudo vira "1 unidade = X reais".
   Moedas que o Frankfurter não cobre ficam manuais (DATA.cambioManual) ou são
   derivadas do euro por paridade fixa (DATA.cambioFixoEur, ex.: BAM).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA, Net = window.Net;
  const A = () => window.App;
  const Cambio = window.Cambio = {};
  const API = 'https://api.frankfurter.dev/v1/';
  const TTL = 12 * Net.HORA;
  const DIAS_HIST = 90;

  let hist = null;        // { 'AAAA-MM-DD': { BRL, GBP, ... } } (base EUR)
  let status = '';        // '', 'carregando', 'ok', 'offline', 'erro'

  const manuais = () => D.cambioManual || [];
  const fixas = () => D.cambioFixoEur || {};
  // moedas pedidas à API: todas as do app, menos BRL/EUR, as manuais e as de paridade fixa
  Cambio.simbolosApi = () => Object.keys(D.cambio).filter(m => m !== 'EUR' && manuais().indexOf(m) < 0 && !fixas()[m]);
  Cambio.automatica = m => m === 'EUR' || !!fixas()[m] || Cambio.simbolosApi().indexOf(m) >= 0;

  // 4 casas para moedas "grandes", 4 algarismos significativos para as pequenas (ex.: HUF 0,01612)
  const arred = v => (v >= 1 ? Math.round(v * 1e4) / 1e4 : +v.toPrecision(4));

  /* ---------------------------------------------------------- funções puras */
  // rates (base EUR, inclui BRL) → { EUR: x, GBP: y, ... } em reais por unidade.
  Cambio.converter = function (rates) {
    const out = {};
    if (!rates || !(rates.BRL > 0)) return out;
    out.EUR = arred(rates.BRL);
    Object.keys(rates).forEach(m => { if (m !== 'BRL' && rates[m] > 0) out[m] = arred(rates.BRL / rates[m]); });
    Object.keys(fixas()).forEach(m => { out[m] = arred(rates.BRL / fixas()[m]); });
    return out;
  };

  // Série de uma moeda em reais: [{ d: 'AAAA-MM-DD', v }] em ordem de data.
  Cambio.serie = function (h, cur) {
    if (!h) return [];
    return Object.keys(h).sort().map(d => {
      const r = h[d];
      if (!r || !(r.BRL > 0)) return null;
      const v = cur === 'EUR' ? r.BRL : fixas()[cur] ? r.BRL / fixas()[cur] : (r[cur] > 0 ? r.BRL / r[cur] : null);
      return v ? { d, v } : null;
    }).filter(Boolean);
  };

  // Variação no período e posição em relação à média.
  Cambio.stats = function (serie) {
    if (!serie || serie.length < 2) return null;
    const vs = serie.map(p => p.v), ini = vs[0], fim = vs[vs.length - 1];
    const media = vs.reduce((a, b) => a + b, 0) / vs.length;
    return { ini, fim, media, min: Math.min.apply(null, vs), max: Math.max.apply(null, vs),
      varPct: (fim / ini - 1) * 100, vsMediaPct: (fim / media - 1) * 100 };
  };

  // Fator aplicado na conversão para reais: spread (cartão/casa de câmbio) e IOF.
  Cambio.fator = function (spreadPct, iofOn, iofPct) {
    const s = Math.max(0, parseFloat(spreadPct) || 0);
    return (1 + s / 100) * (iofOn ? 1 + (parseFloat(iofPct) || 0) / 100 : 1);
  };

  /* ---------------------------------------------------------------- rede */
  const isoHoje = () => new Date().toISOString().slice(0, 10);
  const isoMenos = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  // Aplica as cotações ao estado (só no modo automático). Guarda as anteriores
  // para mostrar quanto o total da viagem mudou.
  function aplicar(novas, data) {
    const S = A().state, info = S.cambioInfo;
    let mudou = false;
    const antes = {};
    Object.keys(S.cambio).forEach(m => { antes[m] = S.cambio[m]; });
    Object.keys(novas).forEach(m => {
      if (m in S.cambio && Math.abs(S.cambio[m] - novas[m]) > 1e-9) { S.cambio[m] = novas[m]; mudou = true; }
    });
    if (mudou && info.data && info.data !== data) { info.ant = antes; info.antData = info.data || ''; }
    info.data = data; info.fonte = 'Frankfurter (BCE)';
    return mudou;
  }

  // Busca a cotação do dia e o histórico de 90 dias. forcar = ignora o cache de 12 h.
  Cambio.atualizar = function (forcar) {
    const App = A(), syms = ['BRL'].concat(Cambio.simbolosApi()).join(',');
    if (forcar) { Net.cacheDel('cambio:latest:' + syms); Net.cacheDel('cambio:hist:' + syms); }
    status = 'carregando';
    const pLatest = Net.getJSON(API + 'latest?base=EUR&symbols=' + syms, { fila: 'cambio', ttl: TTL, chave: 'cambio:latest:' + syms });
    const pHist = Net.getJSON(API + isoMenos(DIAS_HIST) + '..' + isoHoje() + '?base=EUR&symbols=' + syms,
      { fila: 'cambio', ttl: TTL, chave: 'cambio:hist:' + syms, reduzir: j => j.rates || {} });

    return Promise.all([
      pLatest.then(r => {
        status = r.stale ? 'offline' : 'ok';
        if (App.state.cambioModo === 'auto' && r.data && r.data.rates) aplicar(Cambio.converter(r.data.rates), r.data.date);
      }).catch(() => { status = Net.online() ? 'erro' : 'offline'; }),
      pHist.then(r => { hist = r.data; }).catch(() => { /* sem histórico: só não mostra o gráfico */ })
    ]).then(() => { if (App.calc) App.refresh(); });
  };

  Cambio.setModo = function (modo) {
    const App = A();
    if (App.state.cambioModo === modo) return;
    App.state.cambioModo = modo;
    App.refresh();
    if (modo === 'auto') Cambio.atualizar();
  };

  Cambio.init = function () { Cambio.atualizar(); };

  /* ------------------------------------------------------------ interface */
  const esc = s => window.UI.esc(s);
  const dataBr = iso => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
  const fmtTaxa = v => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: v >= 1 ? 4 : 5 });

  // Mini-gráfico de 90 dias: linha na cor de destaque, média tracejada em cinza.
  function spark(cur) {
    const s = Cambio.serie(hist, cur), st = Cambio.stats(s);
    if (!st) return '';
    const W = 120, H = 30, pad = 3, amp = (st.max - st.min) || 1;
    const x = i => pad + i * (W - 2 * pad) / (s.length - 1), y = v => H - pad - (v - st.min) / amp * (H - 2 * pad);
    const d = s.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join('');
    const ult = s.length - 1;
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" data-spark="' + esc(cur) + '" role="img" aria-label="Cotação de ' + esc(cur) +
      ' nos últimos 90 dias"><line class="sp-avg" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(st.media).toFixed(1) + '" y2="' + y(st.media).toFixed(1) + '"/>' +
      '<path class="sp-line" d="' + d + '"/><circle class="sp-dot" cx="' + x(ult).toFixed(1) + '" cy="' + y(s[ult].v).toFixed(1) + '" r="2.4"/>' +
      '<line class="sp-cross" x1="0" x2="0" y1="0" y2="' + H + '"/></svg>';
  }

  function linha(cur) {
    const S = A().state, auto = S.cambioModo === 'auto' && Cambio.automatica(cur);
    const st = Cambio.stats(Cambio.serie(hist, cur));
    let nota = '';
    if (st) {
      const v = st.varPct, m = st.vsMediaPct;
      nota = '<span class="rate-var">' + (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + '% em 90 dias</span>' +
        '<span class="rate-avg">' + (Math.abs(m) < 0.3 ? 'na média de 90 dias' : (m > 0 ? 'acima' : 'abaixo') + ' da média de 90 dias') + '</span>';
    } else if (!Cambio.automatica(cur)) nota = '<span class="rate-avg">sem cotação automática — valor manual</span>';
    else if (D.cambioFixoEur && D.cambioFixoEur[cur]) nota = '<span class="rate-avg">paridade fixa com o euro</span>';
    return '<div class="rate-row"><label for="f-c-' + cur + '"><b>' + esc(cur) + '</b><small>' + esc(D.simbolos[cur] || '') + '</small></label>' +
      '<input id="f-c-' + cur + '" data-fid="f-c-' + cur + '" type="number" min="0" step="any" inputmode="decimal" data-path="cambio.' + cur + '" value="' + esc(S.cambio[cur]) + '"' +
      (auto ? ' readonly title="Cotação automática — mude para Manual para editar"' : '') + '>' +
      '<div class="rate-chart">' + spark(cur) + '</div><div class="rate-note">' + nota + '</div></div>';
  }

  // Bloco "Câmbio" da aba Orçamento.
  Cambio.html = function () {
    const App = A(), S = App.state, info = S.cambioInfo, auto = S.cambioModo === 'auto';
    // em destaque: euro + moedas das cidades do roteiro; o resto fica recolhido
    const emUso = ['EUR'];
    App.calc.route.forEach(id => { const m = App.city(id).moeda; if (emUso.indexOf(m) < 0 && m in S.cambio) emUso.push(m); });
    const outras = Object.keys(S.cambio).filter(m => emUso.indexOf(m) < 0);

    let fonte;
    if (!auto) fonte = 'Valores digitados por você.';
    else if (status === 'carregando' && !info.data) fonte = 'Buscando cotações…';
    else if (info.data) fonte = 'Cotação de ' + dataBr(info.data) + ' · fonte: ' + esc(info.fonte || 'Frankfurter (BCE)') +
      (status === 'offline' ? ' · sem internet, usando a última guardada' : '');
    else fonte = 'Não foi possível buscar as cotações (sem internet?). Usando os valores guardados.';

    let html = '<h4>Câmbio <small>quanto vale 1 unidade, em reais</small></h4>' +
      '<div class="rate-top"><div class="seg" role="group" aria-label="Modo do câmbio">' +
      '<button type="button" data-act="cambio-modo" data-modo="auto" data-fid="cm-auto" class="' + (auto ? 'on' : '') + '" aria-pressed="' + auto + '">Automático</button>' +
      '<button type="button" data-act="cambio-modo" data-modo="manual" data-fid="cm-manual" class="' + (auto ? '' : 'on') + '" aria-pressed="' + !auto + '">Manual</button></div>' +
      (auto ? '<button type="button" class="btn pill" data-act="cambio-atualizar" data-fid="cm-upd">Atualizar</button>' : '') + '</div>' +
      '<p class="ref rate-src">' + fonte + '</p>';
    html += '<div class="rate-list">' + emUso.map(linha).join('') + '</div>';
    if (outras.length) {
      html += '<details class="more"' + (Cambio._aberto ? ' open' : '') + ' data-keep="cambio-outras"><summary>Outras moedas (' + outras.length + ')</summary>' +
        '<div class="rate-list">' + outras.map(linha).join('') + '</div></details>';
    }
    html += '<div class="field inline spread"><label for="f-spread">Spread <small>cartão e casa de câmbio cobram acima da cotação comercial</small></label>' +
      '<div class="pct-in"><input id="f-spread" data-fid="f-spread" type="number" min="0" max="30" step="0.5" inputmode="decimal" data-path="spread" value="' + esc(S.spread) + '"><span>%</span></div></div>';
    return html;
  };

  // Linha no resumo: quanto o total mudou desde a cotação anterior.
  Cambio.resumoHtml = function () {
    const App = A(), c = App.calc, info = App.state.cambioInfo;
    if (App.state.cambioModo !== 'auto' || !info.ant || c.deltaCambio == null || Math.abs(c.deltaCambio) < 1) return '';
    return '<p class="muted">Câmbio: o total ' + (c.deltaCambio > 0 ? 'subiu ' : 'caiu ') + window.Fmt.brl(Math.abs(c.deltaCambio)) +
      ' desde a cotação anterior' + (info.antData ? ' (' + dataBr(info.antData) + ')' : '') + '.</p>';
  };

  // Hover no mini-gráfico: mostra data e valor do ponto mais próximo.
  function bindSpark() {
    const tip = document.getElementById('tip');
    document.addEventListener('pointermove', e => {
      const svg = e.target && e.target.closest ? e.target.closest('svg.spark') : null;
      if (!svg) return;
      const s = Cambio.serie(hist, svg.dataset.spark);
      if (s.length < 2) return;
      const r = svg.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const i = Math.round(f * (s.length - 1)), p = s[i];
      const cross = svg.querySelector('.sp-cross');
      cross.setAttribute('x1', 3 + i * 114 / (s.length - 1)); cross.setAttribute('x2', 3 + i * 114 / (s.length - 1));
      svg.classList.add('hover');
      tip.innerHTML = '<b>' + esc(svg.dataset.spark) + ' · ' + dataBr(p.d) + '</b><span>R$ ' + fmtTaxa(p.v) + '</span>';
      tip.style.left = Math.max(130, Math.min(window.innerWidth - 130, e.clientX)) + 'px';
      tip.style.top = (r.top - 8) + 'px';
      tip.classList.remove('below');
      tip.classList.add('show');
    });
    document.addEventListener('pointerout', e => {
      const svg = e.target && e.target.closest ? e.target.closest('svg.spark') : null;
      if (svg && !(e.relatedTarget && svg.contains(e.relatedTarget))) { svg.classList.remove('hover'); tip.classList.remove('show'); }
    });
    document.addEventListener('toggle', e => {
      if (e.target && e.target.dataset && e.target.dataset.keep === 'cambio-outras') Cambio._aberto = e.target.open;
    }, true);
  }

  // Ações de clique (registradas na interface).
  Cambio.bind = function () {
    const UI = window.UI;
    UI.actions['cambio-modo'] = t => Cambio.setModo(t.dataset.modo);
    UI.actions['cambio-atualizar'] = () => {
      UI.toast('Buscando cotações…');
      Cambio.atualizar(true).then(() => UI.toast(status === 'ok' ? 'Câmbio atualizado.' : 'Não foi possível atualizar agora — usando os valores guardados.'));
    };
    bindSpark();
  };
})();
