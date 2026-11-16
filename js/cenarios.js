/* ==========================================================================
   cenarios.js — Feature 11: cenários A/B/C.

   Guarda várias versões do roteiro e compara até 3 lado a lado.

   - App.state.cenarios = [{ id, nome, alterado, dados }]. O cenário ATIVO fica
     "vivo" nos campos normais do estado (dados = null); os outros guardam um
     retrato compacto (só o que difere do padrão) em "dados".
   - Fazem parte do retrato: data de saída, cidades (seleção, ordem, noites,
     gastos, hospedagem), pontos (seleção, valores, dia), trechos (modo, valor
     real) e as opções da rota inteligente.
   - Itens gerais, orçamento total e câmbio são COMPARTILHADOS por todos os
     cenários, para a comparação ser justa.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Cen = window.Cenarios = {};
  const CAMPOS = ['dataSaida', 'cities', 'pois', 'legs', 'otim'];
  Cen.CAMPOS = CAMPOS;

  /* ====================================================== retrato / restauração */
  const clone = x => JSON.parse(JSON.stringify(x));
  const pegar = S => { const o = {}; CAMPOS.forEach(k => { o[k] = S[k]; }); return o; };

  // Retrato compacto do roteiro que está em S (só o que difere do padrão).
  Cen.retrato = function (S) {
    const T = A()._t;
    return T.diff(pegar(T.defaults()), pegar(S)) || {};
  };

  // Escreve um retrato em S (os campos do roteiro voltam ao padrão + o que o retrato trouxer).
  Cen.restaurar = function (S, dados) {
    const T = A()._t, base = pegar(T.defaults());
    T.merge(base, clone(dados || {}));
    CAMPOS.forEach(k => { S[k] = base[k]; });
    return T.sanitize(S);
  };

  // Roteiro vazio (nenhuma cidade nem ponto selecionado).
  function retratoVazio() {
    const T = A()._t, S = T.defaults();
    Object.keys(S.cities).forEach(id => { S.cities[id].sel = false; });
    Object.keys(S.pois).forEach(id => { S.pois[id].sel = false; });
    return Cen.retrato(S);
  }

  /* ============================================================ lista e ações */
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  Cen.lista = () => A().state.cenarios;
  Cen.ativo = () => { const S = A().state; return S.cenarios.find(c => c.id === S.cenarioAtivo) || S.cenarios[0]; };
  Cen.letra = id => LETRAS[Cen.lista().findIndex(c => c.id === id)] || '?';
  const novoId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const agora = () => new Date().toISOString();

  function proximoNome() {
    const usados = Cen.lista().map(c => c.nome);
    for (let i = 0; i < LETRAS.length; i++) if (usados.indexOf('Cenário ' + LETRAS[i]) < 0) return 'Cenário ' + LETRAS[i];
    return 'Cenário ' + (usados.length + 1);
  }

  // Garante a estrutura (migra dados antigos: o roteiro atual vira "Cenário A").
  Cen.garantir = function (S) {
    if (!Array.isArray(S.cenarios)) S.cenarios = [];
    S.cenarios = S.cenarios.filter(c => c && typeof c === 'object' && c.id).map(c => ({ id: String(c.id), nome: String(c.nome || 'Cenário'),
      alterado: c.alterado || agora(), dados: c.dados && typeof c.dados === 'object' ? c.dados : null }));
    if (!S.cenarios.length) S.cenarios.push({ id: 'c1', nome: 'Cenário A', alterado: agora(), dados: null });
    if (!S.cenarios.some(c => c.id === S.cenarioAtivo)) S.cenarioAtivo = S.cenarios[0].id;
    S.cenarios.forEach(c => { if (c.id === S.cenarioAtivo) c.dados = null; else if (!c.dados) c.dados = {}; });
    if (!Array.isArray(S.cenComparar)) S.cenComparar = [];
    S.cenComparar = S.cenComparar.filter(id => S.cenarios.some(c => c.id === id)).slice(0, 3);
    S.cenNoMapa = !!S.cenNoMapa;
    return S;
  };

  // Marca o cenário ativo como alterado (chamado quando o roteiro muda).
  let ultimoRetrato = '', memo = {};
  Cen.tocar = function () {
    memo = {};       // os números dos cenários guardados dependem de itens gerais/câmbio: recalcula
    const S = A().state, sig = JSON.stringify(pegar(S));
    if (ultimoRetrato && sig !== ultimoRetrato) Cen.ativo().alterado = agora();
    ultimoRetrato = sig;
  };

  function aposTroca(msg) {
    const App = A();
    ultimoRetrato = '';
    App.focus = null;
    window.UI.hideDetail();
    window.MapView.rebuildPois();
    App.refresh();
    window.MapView.fitRoute();
    if (msg) window.UI.toast(msg);
  }

  // Troca o cenário ativo dentro de S (sem interface): guarda o atual e abre o outro.
  Cen.ativar = function (S, id) {
    const de = S.cenarios.find(c => c.id === S.cenarioAtivo), para = S.cenarios.find(c => c.id === id);
    if (!para || para === de) return false;
    const dados = para.dados;
    if (de) de.dados = Cen.retrato(S);
    // marca o novo ativo ANTES de restaurar: sanitize() zera o "dados" de quem estiver ativo
    para.dados = null;
    S.cenarioAtivo = id;
    Cen.restaurar(S, dados);
    memo = {};
    return true;
  };

  Cen.trocar = function (id) {
    if (Cen.ativar(A().state, id)) aposTroca('Cenário: ' + Cen.ativo().nome + '.');
  };

  // Cria um cenário (sem trocar). dados = retrato; devolve o cenário.
  Cen.criar = function (nome, dados) {
    const c = { id: novoId(), nome: nome || proximoNome(), alterado: agora(), dados: dados || {} };
    A().state.cenarios.push(c);
    return c;
  };

  Cen.duplicar = function () {
    const S = A().state, at = Cen.ativo();
    const c = Cen.criar(at.nome + ' (cópia)', Cen.retrato(S));
    Cen.ativar(S, c.id);     // a cópia passa a ser o cenário ativo (o roteiro é idêntico; muda o "dono")
    aposTroca('Cenário duplicado. Você está em "' + c.nome + '".');
  };

  Cen.novoVazio = function () {
    const c = Cen.criar(null, retratoVazio());
    Cen.trocar(c.id);
  };

  Cen.renomear = function (id) {
    const c = Cen.lista().find(x => x.id === id);
    if (!c) return;
    const nome = window.prompt('Nome do cenário (ex.: "Com Roma", "Só Leste Europeu"):', c.nome);
    if (nome == null || !nome.trim()) return;
    c.nome = nome.trim().slice(0, 40);
    A().refresh();
  };

  Cen.excluir = function (id) {
    const S = A().state, c = S.cenarios.find(x => x.id === id);
    if (!c) return;
    if (S.cenarios.length < 2) { window.UI.toast('Este é o único cenário — não dá para excluir.'); return; }
    if (!window.confirm('Excluir o cenário "' + c.nome + '"? Isso não pode ser desfeito.')) return;
    if (c.id === S.cenarioAtivo) {
      const outro = S.cenarios.find(x => x.id !== id);
      Cen.ativar(S, outro.id);
    }
    S.cenarios = S.cenarios.filter(x => x.id !== id);
    S.cenComparar = S.cenComparar.filter(x => x !== id);
    aposTroca('Cenário excluído.');
  };

  /* ================================================================ comparação */
  // Números de um cenário (o ativo usa o cálculo vivo; os outros, um cálculo à parte).
  Cen.resumo = function (id) {
    const App = A(), S = App.state, c = S.cenarios.find(x => x.id === id);
    if (!c) return null;
    if (c.id !== S.cenarioAtivo && memo[c.id]) return memo[c.id];
    let st = S, calc = App.calc;
    if (c.id !== S.cenarioAtivo) {
      st = Cen.restaurar(clone(S), c.dados);
      calc = App.calcDe(st);
    }
    const modos = { trem: 0, onibus: 0, balsa: 0, aviao: 0 };
    calc.legs.forEach(l => { if (!l.intl) modos[l.modo]++; });
    const segs = calc.segs;
    let pontos = 0;
    calc.route.concat((calc.bvs || []).map(b => b.cityId)).forEach(cid => { App.poisOf(cid).forEach(p => { if (st.pois[p.id] && st.pois[p.id].sel) pontos++; }); });
    const r = {
      id: c.id, nome: c.nome, letra: Cen.letra(c.id), ativo: c.id === S.cenarioAtivo, alterado: c.alterado,
      total: calc.total, rota: calc.route.slice(), cidades: calc.route.length, pontos,
      noites: calc.route.reduce((s, cid) => s + st.cities[cid].noites, 0) + calc.segs.filter(x => x.type === 'pernoite').length,
      dias: segs.length ? Math.round((segs[segs.length - 1].start - segs[0].start) / 86400000) + 1 : 0,
      horas: calc.cen.meu.h, modos,
      interesse: calc.route.reduce((s, cid) => s + window.Assistente.estrelas(cid), 0)
    };
    if (!r.ativo) memo[c.id] = r;
    return r;
  };

  // Cenários escolhidos para comparar (o ativo sempre entra; até 3).
  Cen.comparados = function () {
    const S = A().state, ids = [S.cenarioAtivo].concat(S.cenComparar.filter(id => id !== S.cenarioAtivo)).slice(0, 3);
    return ids.map(Cen.resumo).filter(Boolean);
  };

  // Rotas dos outros cenários para o mapa (com "comparar no mapa" ligado).
  Cen.paraMapa = function () {
    const S = A().state;
    if (!S.cenNoMapa || !Cen.aberto) return [];
    return Cen.comparados().filter(r => !r.ativo && r.rota.length).map(r => ({ ids: r.rota, rot: r.letra }));
  };

  /* ================================================================ interface */
  const esc = s => window.UI.esc(s);
  Cen.aberto = false;        // painel de comparação aberto
  let menuAberto = false;

  const dataBr = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

  // Botão e menu da barra superior.
  Cen.renderBarra = function () {
    const btn = document.getElementById('btn-cen'), menu = document.getElementById('cenmenu');
    if (!btn || !menu) return;
    const at = Cen.ativo(), S = A().state;
    btn.innerHTML = '<small>Cenário</small> ' + esc(at.nome) + ' ▾';
    btn.setAttribute('aria-expanded', String(menuAberto));
    menu.hidden = !menuAberto;
    document.getElementById('topbar').classList.toggle('menu-open', menuAberto);
    if (!menuAberto) return;
    menu.innerHTML = '<ul>' + S.cenarios.map(c => '<li class="' + (c.id === at.id ? 'on' : '') + '"><button type="button" class="cm-go" data-act="cen-go" data-id="' + c.id + '">' +
      '<b>' + Cen.letra(c.id) + '</b><span>' + esc(c.nome) + '<small>alterado em ' + dataBr(c.alterado) + '</small></span></button>' +
      '<button type="button" class="cm-ic" data-act="cen-ren" data-id="' + c.id + '" title="Renomear" aria-label="Renomear">✎</button>' +
      '<button type="button" class="cm-ic" data-act="cen-del" data-id="' + c.id + '" title="Excluir" aria-label="Excluir">×</button></li>').join('') + '</ul>' +
      '<div class="cm-acts"><button type="button" class="btn sm primary" data-act="cen-dup">Duplicar o atual</button>' +
      '<button type="button" class="btn sm" data-act="cen-new">Criar vazio</button>' +
      '<button type="button" class="btn sm" data-act="cen-cmp">Comparar…</button></div>';
  };

  // Painel de comparação lado a lado (até 3 cenários).
  Cen.renderPainel = function () {
    const el = document.getElementById('cenbox');
    if (!el) return;
    el.classList.toggle('show', Cen.aberto);
    if (!Cen.aberto) { el.innerHTML = ''; return; }
    const App = A(), S = App.state, F = window.Fmt, UI = window.UI, rs = Cen.comparados(), base = rs[0];
    const dif = (v, b, f) => (b == null || Math.abs(v - b) < 0.5 ? '' : '<small>' + F.sinal(v - b, f) + '</small>');
    const linha = (rot, f, fmt, semDif) => '<tr><th>' + rot + '</th>' + rs.map((r, i) => '<td>' + fmt(f(r)) + (i && !semDif ? dif(f(r), f(base), fmt) : '') + '</td>').join('') + '</tr>';
    const modosTxt = r => window.App.MODOS.map(m => (r.modos[m] ? UI.icon(m) + r.modos[m] : '')).filter(Boolean).join(' ') || '—';
    const int = v => String(Math.round(v));

    let html = '<div class="fc-head"><div><div class="kicker">Cenários</div><h3>Comparação lado a lado</h3></div>' +
      '<button type="button" class="fc-x" data-act="cen-close" aria-label="Fechar">×</button></div>';
    html += '<div class="cb-pick">' + S.cenarios.map(c => {
      const at = c.id === S.cenarioAtivo, on = at || S.cenComparar.indexOf(c.id) >= 0;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="cen-pick" data-id="' + c.id + '"' + (at ? ' disabled title="O cenário ativo sempre entra na comparação"' : '') + '>' + Cen.letra(c.id) + ' · ' + esc(c.nome) + '</button>';
    }).join('') + '</div>';
    if (S.cenarios.length < 2) html += '<p class="muted">Você só tem um cenário. Use <b>Duplicar o atual</b> no menu “Cenário” para criar outro e mudar o que quiser nele.</p>';
    html += '<div class="cb-scroll"><table class="cb-table"><thead><tr><th></th>' + rs.map(r => '<th><b>' + r.letra + '</b> ' + esc(r.nome) + (r.ativo ? ' <i>ativo</i>' : '') + '</th>').join('') + '</tr></thead><tbody>' +
      linha('Total', r => r.total, F.brl) +
      linha('Dias', r => r.dias, int) + linha('Noites', r => r.noites, int) +
      linha('Deslocamento', r => r.horas, F.horas) +
      linha('Cidades', r => r.cidades, int) + linha('Pontos', r => r.pontos, int) +
      '<tr><th>Trechos</th>' + rs.map(r => '<td class="as-m">' + modosTxt(r) + '</td>').join('') + '</tr>' +
      linha('Interesse (★)', r => r.interesse, int) +
      '</tbody></table></div>';
    // cidades de cada cenário; em destaque as que só existem nele
    html += '<div class="cb-cities" style="grid-template-columns:repeat(' + rs.length + ',1fr)">' + rs.map(r => {
      const outros = rs.filter(x => x !== r);
      return '<div><b>' + r.letra + '</b><ol>' + (r.rota.length ? r.rota.map(id => {
        const so = outros.length && outros.every(o => o.rota.indexOf(id) < 0);
        return '<li class="' + (so ? 'only' : '') + '"' + (so ? ' title="Só neste cenário"' : '') + '>' + esc(App.city(id).nome) + '</li>';
      }).join('') : '<li class="vazio">vazio</li>') + '</ol></div>';
    }).join('') + '</div>';
    html += '<label class="check"><input type="checkbox" data-cen-mapa' + (S.cenNoMapa ? ' checked' : '') + '><span>Comparar no mapa <small>(o cenário ativo na cor de destaque; os outros em cinza tracejado, com a letra)</small></span></label>';
    if (rs.length > 1) html += '<p class="muted">Itens gerais, orçamento e câmbio são os mesmos em todos os cenários. Cidades em destaque só existem naquele cenário.</p>';
    el.innerHTML = html;
  };

  Cen.render = function () { Cen.renderBarra(); Cen.renderPainel(); };

  Cen.bind = function () {
    const UI = window.UI, App = A();
    const fecharMenu = () => { if (menuAberto) { menuAberto = false; Cen.renderBarra(); } };
    UI.actions['cen-menu'] = () => { menuAberto = !menuAberto; Cen.renderBarra(); };
    UI.actions['cen-go'] = (t, id) => { fecharMenu(); Cen.trocar(id); };
    UI.actions['cen-dup'] = () => { fecharMenu(); Cen.duplicar(); };
    UI.actions['cen-new'] = () => { fecharMenu(); Cen.novoVazio(); };
    UI.actions['cen-ren'] = (t, id) => Cen.renomear(id);
    UI.actions['cen-del'] = (t, id) => { fecharMenu(); Cen.excluir(id); };
    UI.actions['cen-cmp'] = () => { fecharMenu(); Cen.aberto = true; Cen.renderPainel(); window.MapView.update(); };
    UI.actions['cen-close'] = () => { Cen.aberto = false; Cen.renderPainel(); window.MapView.update(); };
    UI.actions['cen-pick'] = (t, id) => {
      const S = App.state, i = S.cenComparar.indexOf(id);
      if (i >= 0) S.cenComparar.splice(i, 1);
      else { if (S.cenComparar.length >= 2) S.cenComparar.shift(); S.cenComparar.push(id); }     // ativo + 2 = até 3
      App.refresh();
    };
    // alternativa do assistente → novo cenário (sem sair do atual)
    UI.actions['as-save'] = t => {
      const As = window.Assistente, e = As.resultado(), alt = e.res && e.res[t.dataset.n];
      if (!alt) return;
      const tmp = clone(App.state);
      As.aplicarEm(tmp, alt, e.prob);
      const nomes = { interesse: 'Mais interesse', barata: 'Mais barata', equilibrada: 'Equilibrada' };
      const c = Cen.criar('Assistente: ' + nomes[t.dataset.n], Cen.retrato(tmp));
      App.refresh();
      UI.toast('Salvo como "' + c.nome + '". Troque de cenário no menu da barra superior.', 6000);
    };
    document.addEventListener('change', e => {
      if (e.target && e.target.dataset && 'cenMapa' in e.target.dataset) { App.state.cenNoMapa = e.target.checked; App.refresh(); if (e.target.checked) window.MapView.reset(); }
    });
    document.addEventListener('click', e => {
      if (menuAberto && !(e.target.closest && e.target.closest('#cenmenu, #btn-cen'))) fecharMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenu(); });
  };
})();
