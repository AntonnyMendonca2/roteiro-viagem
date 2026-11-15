/* ==========================================================================
   descobrir.js — Feature 6: "Descobrir por perto" e pontos criados pelo usuário.

   Sugere atrações que ainda não estão cadastradas, usando o geosearch da
   Wikipedia (wiki.js). O geosearch também devolve artigos que não são lugares
   (ex.: "Paris Commune"), por isso tudo passa pelo filtro Wiki.ehLugar.
   A popularidade (acessos por mês) é buscada só para os ~30 melhores
   candidatos, no máximo 4 por vez (fila "wiki").

   Os pontos adicionados ficam em App.state.customPois, no mesmo formato de
   DATA.pois (id com prefixo "u-"), e funcionam em tudo: mapa, fotos, totais,
   filtro por tag, dia a dia, exportar e importar.
   ========================================================================== */
(function () {
  'use strict';

  const Wiki = window.Wiki;
  const A = () => window.App;
  const Desc = window.Descobrir = {};
  const MAX_CAND = 30;

  /* ============================================================ funções puras */
  const norm = s => String(s || '').replace(/_/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  Desc.norm = norm;

  /* Filtra os resultados do geosearch.
     ctx: { cidade: [nomes/títulos da cidade], wikis: [títulos wiki já cadastrados],
            nomes: [nomes dos pontos já cadastrados], ocultos: [títulos ocultados] } */
  Desc.filtrar = function (itens, ctx) {
    const cidade = (ctx.cidade || []).map(norm), wikis = (ctx.wikis || []).map(norm), nomes = (ctx.nomes || []).map(norm);
    const ocultos = (ctx.ocultos || []).map(norm), vistos = {};
    return itens.filter(i => {
      const t = norm(i.titulo), n = norm(i.nome);
      if (!t || vistos[t]) return false;
      vistos[t] = true;
      if (cidade.indexOf(t) >= 0 || cidade.indexOf(n) >= 0) return false;            // o artigo da própria cidade
      if (wikis.indexOf(t) >= 0 || nomes.indexOf(t) >= 0 || nomes.indexOf(n) >= 0) return false;   // já é ponto cadastrado
      if (ocultos.indexOf(t) >= 0) return false;
      return Wiki.ehLugar(i);
    });
  };

  // Candidatos para a consulta de popularidade: melhor nota prévia (foto, artigo em português,
  // tipo de lugar); no empate, os mais próximos.
  Desc.candidatos = function (itens, max) {
    return itens.slice().sort((a, b) => Wiki.notaPrevia(b) - Wiki.notaPrevia(a) || (a.dist || 0) - (b.dist || 0)).slice(0, max || MAX_CAND);
  };

  // O geosearch devolve os 50 artigos MAIS PRÓXIMOS do ponto. Para cobrir a cidade,
  // a busca é feita numa grade de 3 × 3 pontos em volta da origem (~2,2 km entre eles).
  Desc.grade = function (o, passoKm) {
    const dLat = (passoKm || 2.2) / 111.2, dLon = dLat / Math.cos(o.lat * Math.PI / 180), out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push({ lat: o.lat + i * dLat, lon: o.lon + j * dLon });
    return out;
  };

  // Ordem final: mais acessados primeiro (com foto na frente em caso de empate).
  Desc.ordenar = itens => itens.slice().sort((a, b) => (b.views || 0) - (a.views || 0) || (b.foto ? 1 : 0) - (a.foto ? 1 : 0));

  // Monta um ponto de interesse do usuário a partir de um item da Wikipedia.
  Desc.novoPonto = function (item, cityId, moeda) {
    const slug = norm(item.nome || item.titulo).replace(/ /g, '-').slice(0, 40) || 'ponto';
    return {
      id: 'u-' + slug + '-' + Math.random().toString(36).slice(2, 6), cityId, custom: true,
      nome: item.nome || item.titulo, lat: item.lat, lon: item.lon, duracaoH: 1,
      preco: { v: 0, cur: moeda, label: 'A definir' }, wiki: String(item.titulo).replace(/ /g, '_'),
      site: 'https://' + (item.pt ? 'pt' : 'en') + '.wikipedia.org/wiki/' + encodeURIComponent(String(item.pt ? item.nome : item.titulo).replace(/ /g, '_')),
      tags: [], selecionado: false, foto: item.foto || '',
      desc: item.desc ? item.desc.charAt(0).toUpperCase() + item.desc.slice(1) + '. (Descrição da Wikipedia; ponto adicionado por você.)' : 'Ponto adicionado por você a partir da Wikipedia.'
    };
  };

  /* ================================================================== busca */
  const res = {};          // cityId → { status: 'carregando' | 'ok' | 'erro', itens }
  const mais = {};         // cityId → quantos cards mostrar
  let buscaNome = { cityId: null, texto: '', status: '', itens: [] };
  Desc.noMapa = false;     // mostrar as sugestões no mapa

  function contexto(cityId) {
    const App = A(), c = App.city(cityId), ps = App.poisOf(cityId);
    return { cidade: [c.wiki, c.nome], wikis: ps.map(p => p.wiki), nomes: ps.map(p => p.nome), ocultos: (App.state.ocultos || {})[cityId] || [] };
  }

  Desc.buscar = function (cityId) {
    const App = A(), c = App.city(cityId), h = App.hosp(cityId);
    res[cityId] = { status: 'carregando', itens: [] };
    avisar();
    // grade em volta do centro e, se a hospedagem ficar afastada, também o ponto dela
    const centros = Desc.grade(c);
    if (h && App.distKm(c, h) > 3) centros.push(h);
    Promise.all(centros.map(p => Wiki.geosearch(p.lat, p.lon, 10000, 50).catch(() => [])))
      .then(listas => {
        const o = h || c;
        const todos = [].concat.apply([], listas).map(i => Object.assign({}, i, { dist: App.distKm(o, i) }));
        return Wiki.comAcessos(Desc.candidatos(Desc.filtrar(todos, contexto(cityId)), MAX_CAND));
      })
      .then(itens => { res[cityId] = { status: 'ok', itens: Desc.ordenar(itens) }; })
      .catch(() => { res[cityId] = { status: 'erro', itens: [] }; })
      .then(() => { avisar(); if (Desc.noMapa) window.MapView.update(); });
  };

  // Sugestões atuais da cidade (já sem as ocultadas e as adicionadas).
  Desc.sugestoes = function (cityId) {
    const r = res[cityId];
    return r && r.status === 'ok' ? Desc.filtrar(r.itens, contexto(cityId)) : [];
  };

  // Sugestões para o mapa (só da cidade aberta, com a opção ligada).
  Desc.paraMapa = function () {
    const f = A().focus;
    if (!Desc.noMapa || !f || f.type !== 'city') return [];
    return Desc.sugestoes(f.id).slice(0, mais[f.id] || 8).map(i => Object.assign({ id: 'sug:' + i.titulo, cityId: f.id }, i));
  };

  /* ================================================================ interface */
  let timer = null;
  function avisar() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (A().calc) window.UI.renderAll(); }, 120);
  }

  const esc = s => window.UI.esc(s);
  const fmtViews = v => (v >= 1000 ? Math.round(v / 1000).toLocaleString('pt-BR') + ' mil' : String(v || 0)) + ' acessos/mês';

  function card(i, cityId, origemBusca) {
    const dist = i.dist != null ? window.Ape.fmtKm(i.dist) + (A().hosp(cityId) ? ' da hospedagem' : ' do centro') : '';
    return '<li class="sug">' + window.UI.photoUrl(i.foto, i.nome, 'sug-ph') + '<div class="sug-t"><b>' + esc(i.nome) + '</b>' +
      (i.desc ? '<span>' + esc(i.desc) + '</span>' : '') +
      '<small>' + [dist, i.views != null ? fmtViews(i.views) : ''].filter(Boolean).join(' · ') + '</small>' +
      '<div class="sug-b"><button type="button" class="btn sm primary" data-act="sug-add" data-id="' + esc(cityId) + '" data-t="' + esc(i.titulo) + '"' + (origemBusca ? ' data-busca="1"' : '') + '>+ Adicionar</button>' +
      (origemBusca ? '' : '<button type="button" class="btn sm" data-act="sug-hide" data-id="' + esc(cityId) + '" data-t="' + esc(i.titulo) + '">Ocultar</button>') +
      '<a class="btn sm" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(i.titulo.replace(/ /g, '_')) + '" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a></div></div></li>';
  }

  // Seção "Descobrir por perto" do painel da cidade.
  Desc.cityHtml = function (c) {
    const App = A(), r = res[c.id], n = mais[c.id] || 8, ocultos = ((App.state.ocultos || {})[c.id] || []).length;
    let html = '<h4>Descobrir por perto <small>atrações que ainda não estão na lista</small></h4>';
    if (!r) html += '<button type="button" class="btn wide" data-act="sug-search" data-id="' + c.id + '" data-fid="sug-s-' + c.id + '">Buscar sugestões na Wikipedia</button>';
    else if (r.status === 'carregando') html += '<p class="muted">Buscando lugares próximos e a popularidade de cada um…</p>';
    else if (r.status === 'erro') html += '<p class="muted">Não foi possível buscar agora (sem internet?). <button type="button" class="lnk" data-act="sug-search" data-id="' + c.id + '">Tentar de novo</button></p>';
    else {
      const lista = Desc.sugestoes(c.id);
      html += '<label class="check"><input type="checkbox" data-desc-mapa data-fid="sug-mapa"' + (Desc.noMapa ? ' checked' : '') + '><span>Mostrar as sugestões no mapa <small>(losangos cinza)</small></span></label>';
      html += lista.length ? '<ul class="sugs">' + lista.slice(0, n).map(i => card(i, c.id)).join('') + '</ul>' : '<p class="muted">Nenhuma sugestão nova por aqui.</p>';
      if (lista.length > n) html += '<button type="button" class="btn sm" data-act="sug-more" data-id="' + c.id + '" data-fid="sug-more">Mostrar mais (' + (lista.length - n) + ')</button>';
    }
    if (ocultos) html += '<p class="muted">' + ocultos + (ocultos > 1 ? ' sugestões ocultadas' : ' sugestão ocultada') + ' · <button type="button" class="lnk" data-act="sug-unhide" data-id="' + c.id + '">mostrar de novo</button></p>';

    // busca manual pelo nome
    const b = buscaNome.cityId === c.id ? buscaNome : { texto: '', status: '', itens: [] };
    html += '<div class="field"><label for="f-sug-nome">Adicionar ponto pelo nome</label><div class="money-in">' +
      '<input type="text" id="f-sug-nome" data-fid="f-sug-nome" data-sug-nome="' + c.id + '" placeholder="Ex.: Père Lachaise" value="' + esc(b.texto) + '">' +
      '<button type="button" class="btn" data-act="sug-name" data-id="' + c.id + '">Buscar</button></div></div>';
    if (b.status === 'carregando') html += '<p class="muted">Buscando…</p>';
    else if (b.status === 'erro') html += '<p class="muted">Não foi possível buscar agora.</p>';
    else if (b.status === 'ok') html += b.itens.length ? '<ul class="sugs">' + b.itens.map(i => card(i, c.id, true)).join('') + '</ul>'
      : '<p class="muted">Nada encontrado com coordenadas. Tente o nome em inglês ou no idioma local.</p>';
    return html;
  };

  function buscarNome(cityId) {
    const App = A(), el = document.getElementById('f-sug-nome'), texto = el ? el.value.trim() : '';
    if (texto.length < 2) { window.UI.toast('Digite o nome do lugar.'); return; }
    const c = App.city(cityId);
    buscaNome = { cityId, texto, status: 'carregando', itens: [] };
    avisar();
    Wiki.buscar(texto + ' ' + c.wiki).then(a => (a.length ? a : Wiki.buscar(texto)))
      .then(itens => {
        const o = App.hosp(cityId) || c;
        buscaNome = { cityId, texto, status: 'ok', itens: itens.map(i => Object.assign({}, i, { dist: App.distKm(o, i) })).filter(i => i.dist < 150).slice(0, 5) };
      })
      .catch(() => { buscaNome = { cityId, texto, status: 'erro', itens: [] }; })
      .then(avisar);
  }

  function achar(cityId, titulo, daBusca) {
    const lista = daBusca ? buscaNome.itens : ((res[cityId] || {}).itens || []);
    return lista.find(i => i.titulo === titulo);
  }

  Desc.bind = function () {
    const UI = window.UI, App = A();
    UI.actions['sug-search'] = (t, id) => Desc.buscar(id);
    UI.actions['sug-more'] = (t, id) => { mais[id] = (mais[id] || 8) + 8; UI.renderAll(); window.MapView.update(); };
    UI.actions['sug-name'] = (t, id) => buscarNome(id);
    UI.actions['sug-add'] = (t, id) => {
      const i = achar(id, t.dataset.t, !!t.dataset.busca);
      if (!i) return;
      const p = App.addCustomPoi(Desc.novoPonto(i, id, App.city(id).moeda));
      if (t.dataset.busca) buscaNome = { cityId: null, texto: '', status: '', itens: [] };
      UI.toast(p.nome + ' entrou na lista de pontos de ' + App.city(id).nome + '.');
    };
    UI.actions['sug-hide'] = (t, id) => {
      const S = App.state;
      if (!S.ocultos[id]) S.ocultos[id] = [];
      if (S.ocultos[id].indexOf(t.dataset.t) < 0) S.ocultos[id].push(t.dataset.t);
      App.refresh();
    };
    UI.actions['sug-unhide'] = (t, id) => { delete App.state.ocultos[id]; App.refresh(); };
    UI.actions['poi-delete'] = (t, id) => {
      const p = App.poi(id);
      if (!p || !p.custom || !window.confirm('Excluir o ponto "' + p.nome + '"?')) return;
      App.removeCustomPoi(id);
      UI.toast('Ponto excluído.');
    };
    // paisagem do caminho do trem → ponto de interesse (na cidade do trecho mais próxima)
    UI.actions['cena-add'] = t => {
      const leg = App.calc.legs.find(l => l.key === t.dataset.leg), c = leg && window.Trilhos.cenas(leg);
      const x = c && c.lista.find(i => i.titulo === t.dataset.t);
      if (!x) return;
      const a = App.city(leg.from), b = App.city(leg.to), cid = App.distKm(a, x) <= App.distKm(b, x) ? a.id : b.id;
      const p = App.addCustomPoi(Desc.novoPonto(x, cid, App.city(cid).moeda));
      UI.toast(p.nome + ' virou ponto de interesse de ' + App.city(cid).nome + '.');
    };
    window.Trilhos.botaoAdd = (leg, x) => {
      const ja = App.pois().some(p => p.custom && norm(p.wiki) === norm(x.titulo));
      return ja ? '<span class="sc-ok" title="Já está nos seus pontos">✓</span>'
        : '<button type="button" class="btn sm" data-act="cena-add" data-leg="' + esc(leg.key) + '" data-t="' + esc(x.titulo) + '" title="Adicionar como ponto de interesse" aria-label="Adicionar como ponto de interesse">+</button>';
    };
    document.addEventListener('change', e => {
      if (e.target && e.target.dataset && 'descMapa' in e.target.dataset) { Desc.noMapa = e.target.checked; window.MapView.update(); }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.sugNome) { e.preventDefault(); buscarNome(e.target.dataset.sugNome); }
    });
  };
})();
