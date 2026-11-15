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
