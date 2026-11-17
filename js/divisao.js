/* ==========================================================================
   divisao.js — divisão de gastos entre quem viaja ("quem deve a quem").

   - Pessoas: só nomes (state.divisao.pessoas).
   - Gastos: os mesmos que entram no total da viagem (gastos de cada cidade,
     passeios selecionados, trechos, pernoites, itens gerais), com o mesmo
     valor do orçamento (estimativa, ou o valor real quando preenchido), mais
     gastos avulsos lançados aqui (state.divisao.extras).
   - Para cada gasto: quem pagou e entre quem dividir (padrão: todos).
   - Resultado: quanto cada um pagou, quanto lhe cabe e os acertos, com o
     menor número de transferências (o maior devedor paga ao maior credor).
   Viaja junto com o roteiro e com a edição em conjunto; fica fora do link
   "sem hospedagens e valores" (js/compartilhar.js).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Divisao = window.Divisao = {};
  const MAX_PESSOAS = 12;
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const novoId = p => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);

  /* ------------------------------------------------------------- estado */
  Divisao.padrao = () => ({ pessoas: [], pagos: {}, extras: [] });

  // Limpa o que veio do localStorage, de um link ou da edição em conjunto.
  Divisao.limpar = function (dv) {
    const o = isObj(dv) ? dv : {};
    const pessoas = (Array.isArray(o.pessoas) ? o.pessoas : [])
      .filter(p => isObj(p) && /^p[a-z0-9]{2,12}$/.test(p.id || '') && typeof p.nome === 'string' && p.nome.trim())
      .slice(0, MAX_PESSOAS).map(p => ({ id: p.id, nome: p.nome.trim().slice(0, 30) }));
    const ids = new Set(pessoas.map(p => p.id));
    const quem = (x, entre) => ({ por: ids.has(x && x.por) ? x.por : '', entre: (Array.isArray(entre) ? entre : []).filter((id, i, a) => ids.has(id) && a.indexOf(id) === i) });
    const pagos = {};
    if (isObj(o.pagos)) Object.keys(o.pagos).forEach(k => {
      if (!/^[a-z]{1,2}:[^\s]{1,120}$/.test(k) || !isObj(o.pagos[k])) return;
      pagos[k] = quem(o.pagos[k], o.pagos[k].entre);     // "sem pagador" fica como valor vazio (não some), para a edição em conjunto propagar
    });
    const extras = (Array.isArray(o.extras) ? o.extras : []).filter(e => isObj(e) && /^x[a-z0-9]{2,12}$/.test(e.id || ''))
      .slice(0, 200).map(e => Object.assign({ id: e.id, desc: String(e.desc || 'Gasto').trim().slice(0, 60) || 'Gasto',
        v: Math.max(0, +e.v || 0), cur: D.moedas.indexOf(e.cur) >= 0 ? e.cur : 'BRL' }, quem(e, e.entre)));
    return { pessoas, pagos, extras };
  };

  /* ---------------------------------------------------------- gastos */
  // Lista dos gastos da viagem (com valor > 0), na moeda do app (R$).
  // chave: identificador estável usado em state.divisao.pagos.
  Divisao.itens = function (S, calc) {
    const App = A(), itens = [], add = (chave, desc, grupo, brl) => { if (brl > 0.004) itens.push({ chave, desc, grupo, brl }); };
    const nome = id => (id === 'vcp' ? App.origem().nomeCurto : App.city(id).nome);
    const MODO = { trem: 'trem', onibus: 'ônibus', balsa: 'balsa', aviao: 'avião' };
    const cidades = calc.route.concat(calc.bvs.map(b => b.cityId));
    cidades.forEach(id => {
      const c = App.city(id), cs = S.cities[id], bv = calc.bvByCity && calc.bvByCity[id];
      D.categorias.forEach(k => {
        if (k.id === 'hospedagem' && bv) return;
        add('c:' + id + '.' + k.id, k.nome, c.nome, App.toBRL(cs.custos[k.id].v, cs.custos[k.id].cur));
      });
      App.poisOf(id).forEach(p => {
        const ps = S.pois[p.id];
        if (!ps || !ps.sel) return;
        add('p:' + p.id, p.nome, c.nome, App.toBRL(ps.valor.v, ps.valor.cur));
        if (ps.transporte) add('t:' + p.id, p.nome + ' (transporte)', c.nome, App.toBRL(ps.transporte.v, ps.transporte.cur));
      });
    });
    calc.legs.forEach(l => {
      const r = l.custo || {};
      add('l:' + l.key, nome(l.from) + ' → ' + nome(l.to) + ' (' + (l.intl ? 'voo internacional' : MODO[l.modo] || l.modo) + ')', 'Trechos', r.transporte || 0);
      const o = l.opts[l.modo];
      if (r.pernoite) add('n:' + l.key, 'Pernoite' + (o && o.via ? ' em ' + o.via.nome : '') + ' (' + nome(l.from) + ' → ' + nome(l.to) + ')', 'Trechos', r.pernoite);
    });
    calc.bvs.forEach(b => add('l:' + b.leg.key, nome(b.base) + ' ⇄ ' + nome(b.cityId) + ' (bate-volta)', 'Trechos', (b.leg.custo || {}).transporte || 0));
    D.gerais.forEach(g => add('g:' + g.id, g.nome, 'Gerais', App.toBRL(S.gerais[g.id].v, S.gerais[g.id].cur)));
    (S.divisao.extras || []).forEach(e => itens.push({ chave: 'x:' + e.id, desc: e.desc, grupo: 'Lançados aqui', brl: App.toBRL(e.v, e.cur), extra: e }));
    return itens;
  };

  /* ------------------------------------------------------------ conta */
  const cent = x => Math.round(x * 100) / 100;
  // R$ com centavos e sinal de menos de verdade (dividir conta pede centavos)
  const brl = v => (v < -0.004 ? '−' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  Divisao.brl = brl;

  // Função pura: itens [{chave, brl}], pessoas [{id}], pagos {chave: {por, entre}} (extras trazem o próprio "quem").
  // → { pessoas: {id: {pagou, parte, saldo}}, acertos: [{de, para, valor}], semPagador: {n, brl}, total }
  Divisao.calcular = function (itens, pessoas, pagos) {
    const ids = pessoas.map(p => p.id), r = {}, sem = { n: 0, brl: 0 };
    ids.forEach(id => { r[id] = { pagou: 0, parte: 0, saldo: 0 }; });
    let total = 0;
    itens.forEach(it => {
      const q = it.extra || (pagos || {})[it.chave] || {};
      if (!ids.length || !r[q.por]) { sem.n++; sem.brl += it.brl; return; }
      const entre = (q.entre && q.entre.length ? q.entre : ids).filter(id => r[id]);
      const lista = entre.length ? entre : ids;
      r[q.por].pagou += it.brl;
      lista.forEach(id => { r[id].parte += it.brl / lista.length; });
      total += it.brl;
    });
    ids.forEach(id => { const x = r[id]; x.pagou = cent(x.pagou); x.parte = cent(x.parte); x.saldo = cent(x.pagou - x.parte); });
    // acertos: o maior devedor paga ao maior credor, até zerar (no máximo n − 1 transferências)
    const cred = ids.filter(id => r[id].saldo > 0.009).map(id => ({ id, v: r[id].saldo })).sort((a, b) => b.v - a.v);
    const dev = ids.filter(id => r[id].saldo < -0.009).map(id => ({ id, v: -r[id].saldo })).sort((a, b) => b.v - a.v);
    const acertos = [];
    let i = 0, j = 0;
    while (i < dev.length && j < cred.length) {
      const v = cent(Math.min(dev[i].v, cred[j].v));
      if (v > 0.009) acertos.push({ de: dev[i].id, para: cred[j].id, valor: v });
      dev[i].v = cent(dev[i].v - v); cred[j].v = cent(cred[j].v - v);
      if (dev[i].v <= 0.009) i++;
      if (cred[j].v <= 0.009) j++;
    }
    return { pessoas: r, acertos, semPagador: { n: sem.n, brl: cent(sem.brl) }, total: cent(total) };
  };

  /* ------------------------------------------------------------ ações */
  const dv = () => A().state.divisao;
  const salvar = () => A().refresh();

  Divisao.addPessoa = function (nome) {
    nome = String(nome || '').trim().slice(0, 30);
    if (!nome) return false;
    const P = dv().pessoas;
    if (P.length >= MAX_PESSOAS || P.some(p => p.nome.toLowerCase() === nome.toLowerCase())) return false;
    P.push({ id: novoId('p'), nome });
    salvar();
    return true;
  };
  Divisao.delPessoa = function (id) {
    const S = A().state;
    S.divisao.pessoas = S.divisao.pessoas.filter(p => p.id !== id);
    S.divisao = Divisao.limpar(S.divisao);        // tira a pessoa de "pago por" e "dividir entre"
    salvar();
  };
  Divisao.setPor = function (chave, por) {
    const P = dv().pagos, ex = dv().extras.find(e => 'x:' + e.id === chave);
    if (ex) ex.por = por || '';
    else P[chave] = Object.assign({ por: '', entre: [] }, P[chave], { por: por || '' });
    salvar();
  };
  // Liga/desliga uma pessoa no "dividir entre" de um gasto (vazio = todos).
  Divisao.toggleEntre = function (chave, id) {
    const todos = dv().pessoas.map(p => p.id), ex = dv().extras.find(e => 'x:' + e.id === chave);
    const alvo = ex || (dv().pagos[chave] = Object.assign({ por: '', entre: [] }, dv().pagos[chave]));
    let e = alvo.entre && alvo.entre.length ? alvo.entre.slice() : todos.slice();
    e = e.indexOf(id) >= 0 ? e.filter(x => x !== id) : e.concat([id]);
    if (!e.length) return;                                  // alguém tem de pagar a parte
    alvo.entre = e.length === todos.length ? [] : todos.filter(x => e.indexOf(x) >= 0);
    salvar();
  };
  // "Tudo que falta foi pago por": preenche os gastos sem pagador.
  Divisao.preencher = function (por) {
    const App = A();
    if (!dv().pessoas.some(p => p.id === por)) return 0;
    let n = 0;
    Divisao.itens(App.state, App.calc).forEach(it => {
      const q = it.extra || dv().pagos[it.chave];
      if (q && q.por) return;
      if (it.extra) it.extra.por = por; else dv().pagos[it.chave] = Object.assign({ entre: [] }, dv().pagos[it.chave], { por });
      n++;
    });
    salvar();
    return n;
  };
  Divisao.addExtra = function (desc, v, cur, por) {
    v = +String(v).replace(',', '.');
    if (!(v > 0)) return false;
    dv().extras.push({ id: novoId('x'), desc: String(desc || '').trim().slice(0, 60) || 'Gasto', v, cur: D.moedas.indexOf(cur) >= 0 ? cur : 'BRL', por: por || '', entre: [] });
    salvar();
    return true;
  };
  Divisao.delExtra = function (id) {
    const S = A().state;
    S.divisao.extras = S.divisao.extras.filter(e => e.id !== id);
    salvar();
  };

  /* ---------------------------------------------------------- interface */
  Divisao.html = function () {
    const App = A(), UI = window.UI, F = window.Fmt, esc = UI.esc, S = App.state, P = S.divisao.pessoas;
    let h = '<h4>Divisão de gastos <small>quem pagou o quê</small></h4>' +
      '<p class="muted">Cadastre quem viaja e diga quem pagou cada gasto: o app calcula quem deve a quem. Na edição em conjunto, todos veem e editam a mesma conta.</p>' +
      '<div class="dv-pessoas">' + P.map(p => '<span class="chip dv-p">' + esc(p.nome) +
        ' <button type="button" class="dv-x" data-act="dv-del-pessoa" data-id="' + esc(p.id) + '" aria-label="Remover ' + esc(p.nome) + '">×</button></span>').join('') + '</div>' +
      (P.length < MAX_PESSOAS ? '<div class="money-in dv-add"><input type="text" id="dv-nome" data-fid="dv-nome" maxlength="30" placeholder="Nome de quem viaja" aria-label="Nome de quem viaja">' +
        '<button type="button" class="btn" data-act="dv-add-pessoa">Adicionar</button></div>' : '');
    if (P.length < 2) return h + '<p class="muted">Adicione pelo menos duas pessoas para dividir os gastos.</p>';

    const itens = Divisao.itens(S, App.calc), r = Divisao.calcular(itens, P, S.divisao.pagos);
    const nomeDe = id => (P.find(p => p.id === id) || {}).nome || '?';
    const opcoesPor = sel => '<option value="">— quem pagou?</option>' + P.map(p => '<option value="' + esc(p.id) + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.nome) + '</option>').join('');

    // resultado
    h += '<div class="dv-res"><table class="dv-tab"><thead><tr><th>Pessoa</th><th>Pagou</th><th>Parte</th><th>Saldo</th></tr></thead><tbody>' +
      P.map(p => { const x = r.pessoas[p.id]; return '<tr><td>' + esc(p.nome) + '</td><td>' + brl(x.pagou) + '</td><td>' + brl(x.parte) + '</td><td class="' +
        (x.saldo > 0.009 ? 'pos' : x.saldo < -0.009 ? 'neg' : '') + '">' + (x.saldo > 0.009 ? '+' : '') + brl(x.saldo) + '</td></tr>'; }).join('') + '</tbody></table>';
    h += r.acertos.length
      ? '<p class="dv-ac-t">Para acertar:</p><ul class="dv-ac">' + r.acertos.map(a => '<li><b>' + esc(nomeDe(a.de)) + '</b> paga <b>' + brl(a.valor) + '</b> a <b>' + esc(nomeDe(a.para)) + '</b></li>').join('') + '</ul>'
      : (r.total > 0 ? '<p class="dv-ok">✓ Tudo certo: ninguém deve nada.</p>' : '');
    if (r.semPagador.n) {
      h += '<p class="warn-line">' + r.semPagador.n + (r.semPagador.n === 1 ? ' gasto' : ' gastos') + ' (' + brl(r.semPagador.brl) + ') ainda sem "quem pagou" — fora da conta.</p>' +
        '<div class="money-in dv-fill"><select data-dv-fill aria-label="Quem pagou o que falta">' + opcoesPor('').replace('— quem pagou?', 'Tudo que falta foi pago por…') + '</select></div>';
    }
    h += '</div>';

    // gastos
    const linha = it => {
      const q = it.extra || S.divisao.pagos[it.chave] || {}, entre = q.entre && q.entre.length ? q.entre : P.map(p => p.id);
      return '<li class="dv-it"><div class="dv-it-t"><b>' + esc(it.desc) + '</b><small>' + esc(it.grupo) + ' · ' + brl(it.brl) + '</small>' +
        (it.extra ? '<button type="button" class="dv-x" data-act="dv-del-extra" data-id="' + esc(it.extra.id) + '" aria-label="Apagar este gasto">×</button>' : '') + '</div>' +
        '<div class="dv-it-c"><select data-dv-por="' + esc(it.chave) + '" aria-label="Quem pagou ' + esc(it.desc) + '">' + opcoesPor(q.por) + '</select>' +
        '<span class="dv-entre" title="Dividir entre">' + P.map(p => '<button type="button" class="dv-ini' + (entre.indexOf(p.id) >= 0 ? ' on' : '') + '" data-act="dv-entre" data-chave="' + esc(it.chave) + '" data-id="' + esc(p.id) +
          '" aria-pressed="' + (entre.indexOf(p.id) >= 0) + '" title="' + esc(p.nome) + (entre.indexOf(p.id) >= 0 ? ' divide este gasto' : ' não divide este gasto') + '">' + esc(UI.iniciais(p.nome)) + '</button>').join('') + '</span></div></li>';
    };
    h += '<details class="dv-lista"' + (Divisao.aberto ? ' open' : '') + '><summary>Gastos da viagem <small>(' + itens.length + ' · ' + brl(itens.reduce((a, i) => a + i.brl, 0)) + ')</small></summary>' +
      '<p class="muted">Os mesmos valores do orçamento (estimativa, ou o valor real quando você preencheu). As iniciais mostram entre quem o gasto é dividido; clique para tirar ou incluir alguém.</p>' +
      (itens.length ? '<ul class="dv-its">' + itens.map(linha).join('') + '</ul>' : '<p class="muted">Ainda não há gastos no roteiro.</p>') +
      '<div class="dv-extra"><b>Lançar um gasto</b><input type="text" id="dv-ex-desc" data-fid="dv-ex-desc" maxlength="60" placeholder="Ex.: Jantar em Paris" aria-label="Descrição do gasto">' +
      '<div class="money-in"><input type="number" id="dv-ex-v" data-fid="dv-ex-v" min="0" step="0.01" inputmode="decimal" placeholder="Valor" aria-label="Valor">' +
      '<select id="dv-ex-cur" aria-label="Moeda">' + D.moedas.map(m => '<option>' + m + '</option>').join('') + '</select></div>' +
      '<div class="money-in"><select id="dv-ex-por" aria-label="Quem pagou">' + opcoesPor('') + '</select>' +
      '<button type="button" class="btn" data-act="dv-add-extra">Lançar</button></div></div></details>';
    return h;
  };

  Divisao.bind = function () {
    const UI = window.UI, v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    UI.actions['dv-add-pessoa'] = () => {
      if (!Divisao.addPessoa(v('dv-nome'))) UI.toast('Digite um nome novo (até ' + MAX_PESSOAS + ' pessoas).');
      else { const el = document.getElementById('dv-nome'); if (el) el.focus(); }
    };
    UI.actions['dv-del-pessoa'] = t => {
      const p = dv().pessoas.find(x => x.id === t.dataset.id);
      if (p && window.confirm('Tirar ' + p.nome + ' da divisão de gastos? Os gastos que essa pessoa pagou ficam sem "quem pagou".')) Divisao.delPessoa(p.id);
    };
    UI.actions['dv-entre'] = t => { Divisao.aberto = true; Divisao.toggleEntre(t.dataset.chave, t.dataset.id); };
    UI.actions['dv-add-extra'] = () => {
      Divisao.aberto = true;
      if (!Divisao.addExtra(v('dv-ex-desc'), v('dv-ex-v'), v('dv-ex-cur'), v('dv-ex-por'))) UI.toast('Informe o valor do gasto.');
    };
    UI.actions['dv-del-extra'] = t => { Divisao.aberto = true; Divisao.delExtra(t.dataset.id); };
    document.addEventListener('change', e => {
      const t = e.target;
      if (!t || !t.dataset) return;
      if (t.dataset.dvPor !== undefined) { Divisao.aberto = true; Divisao.setPor(t.dataset.dvPor, t.value); }
      else if ('dvFill' in t.dataset && t.value) { const n = Divisao.preencher(t.value); UI.toast(n + (n === 1 ? ' gasto marcado.' : ' gastos marcados.')); }
    });
    document.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('dv-lista')) Divisao.aberto = e.target.open; }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'dv-nome') { e.preventDefault(); UI.actions['dv-add-pessoa'](); } });
  };
})();
