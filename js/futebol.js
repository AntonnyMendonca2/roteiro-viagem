/* ==========================================================================
   futebol.js — Feature 7: jogos de futebol nas datas do roteiro.

   Em camadas (não existe API gratuita, sem chave, que o navegador possa chamar):
   1. Sem API: os clubes de cada cidade (data-futebol.js), com estádio e links
      oficiais de calendário e ingressos; o tour do estádio fica ligado ao clube.
   2. Jogos cadastrados à mão: DATA.jogos + App.state.jogos (pela interface).
   3. Opcional: se DATA.config.futebolProxyUrl estiver preenchido, busca os jogos
      por um Cloudflare Worker (worker/futebol.js) que guarda a chave da
      football-data.org. A chave NUNCA fica no site.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Fut = window.Futebol = {};
  const DIA = 86400000;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  /* ================================================================== clubes */
  const clubePorId = {};
  (D.clubes || []).forEach(k => { clubePorId[k.id] = k; });
  Fut.clube = id => clubePorId[id] || null;
  Fut.clubes = cityId => (D.clubes || []).filter(k => k.cityId === cityId);
  // clube mandante de um jogo: pelo campo "clube" ou pelo nome do mandante
  Fut.clubeDe = function (j) {
    if (j.clube && clubePorId[j.clube]) return clubePorId[j.clube];
    const n = norm(j.casa);
    return Fut.clubes(j.cityId).find(k => norm(k.nome) === n || (n && (norm(k.nome).indexOf(n) >= 0 || n.indexOf(norm(k.nome)) >= 0))) || null;
  };

  /* =================================================================== jogos */
  const auto = {};       // jogos vindos do proxy: chave da consulta → [jogos]
  const DATA_RE = /^\d{4}-\d{2}-\d{2}$/, HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  // Deixa um jogo no formato certo (ou devolve null se faltar o essencial).
  Fut.limpar = function (j, origem) {
    if (!j || typeof j !== 'object' || !DATA_RE.test(j.data || '') || !A().city(j.cityId)) return null;
    const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const casa = t(j.casa, 60), fora = t(j.fora, 60);
    if (!casa || !fora) return null;
    const link = t(j.ingressos, 300);
    return { id: t(j.id, 40) || ('j-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)), data: j.data,
      hora: HORA_RE.test(j.hora || '') ? j.hora : '', casa, fora, comp: t(j.comp, 60), estadio: t(j.estadio, 80), cityId: j.cityId,
      clube: clubePorId[j.clube] ? j.clube : '', ingressos: /^https?:\/\//i.test(link) ? link : '', origem: origem || 'meu' };
  };

  // Todos os jogos conhecidos: do data-futebol.js, os meus e os automáticos (sem repetir).
  Fut.todos = function () {
    const S = A().state, lista = [], visto = {};
    const por = (j, origem) => {
      const x = Fut.limpar(j, origem);
      if (!x) return;
      const k = x.data + '|' + norm(x.casa);
      if (visto[k]) return;          // o cadastrado à mão vale mais que o automático
      visto[k] = true; lista.push(x);
    };
    (S.jogos || []).forEach(j => por(j, 'meu'));
    (D.jogos || []).forEach(j => por(j, 'data'));
    Object.keys(auto).forEach(k => auto[k].forEach(j => por(j, 'auto')));
    return lista.sort((a, b) => (a.data + a.hora < b.data + b.hora ? -1 : 1));
  };
  Fut.daCidade = cityId => Fut.todos().filter(j => j.cityId === cityId);

  /* Como o jogo cai nas datas do roteiro.
     tipo: 'ok' (estou na cidade) · 'chegada' · 'saida' (dia de trocar de cidade)
           'antes' (o jogo é antes de eu chegar) · 'depois' (já fui embora) · 'fora' (cidade fora do roteiro) */
  Fut.situacao = function (j, calc) {
    const App = A(), seg = (calc || App.calc).segByCity[j.cityId], nome = App.city(j.cityId).nome;
    if (!seg) return { tipo: 'fora', ok: false, texto: nome + ' não está no roteiro' };
    const d = App.parseDate(j.data).getTime(), ini = seg.start.getTime(), fim = seg.end.getTime();
    const dias = n => n + (n === 1 ? ' dia' : ' dias');
    if (d < ini) return { tipo: 'antes', ok: false, dias: Math.round((ini - d) / DIA), texto: 'Você chega ' + dias(Math.round((ini - d) / DIA)) + ' depois do jogo' };
    if (d > fim) return { tipo: 'depois', ok: false, dias: Math.round((d - fim) / DIA), texto: 'Você sai ' + dias(Math.round((d - fim) / DIA)) + ' antes do jogo' };
    if (d === fim) return { tipo: 'saida', ok: true, texto: 'É o dia em que você sai de ' + nome + ' — confira o horário da partida' };
    if (d === ini) return { tipo: 'chegada', ok: true, texto: 'É o dia em que você chega a ' + nome + ' — confira o horário da chegada' };
    return { tipo: 'ok', ok: true, texto: 'Você estará em ' + nome + ' neste dia' };
  };

  // Jogos de uma cidade em um dia do roteiro (para a linha do tempo).
  Fut.noDia = (cityId, iso) => Fut.daCidade(cityId).filter(j => j.data === iso);
  const titulo = j => j.casa + ' × ' + j.fora;

  Fut.tlHtml = function (cityId, d) {
    if (!cityId) return { html: '', titulo: '' };
    const js = Fut.noDia(cityId, A().iso(d));
    if (!js.length) return { html: '', titulo: '' };
    return { html: '<s class="tl-ball" aria-label="Jogo de futebol">' + window.UI.icon('bola') + '</s>', titulo: js.map(j => 'Jogo: ' + titulo(j) + (j.hora ? ' às ' + j.hora : '')).join(' · ') };
  };

  /* ============================================== jogo → ponto (entra no orçamento) */
  const poiIdDe = j => 'u-jogo-' + norm(j.id).replace(/ /g, '-');

  Fut.pontoDe = function (j) {
    const App = A(), k = Fut.clubeDe(j), c = App.city(j.cityId), tour = k && k.poi ? App.poi(k.poi) : null, F = window.Fmt;
    const d = App.parseDate(j.data);
    return {
      id: poiIdDe(j), cityId: j.cityId, custom: true, nome: 'Jogo: ' + titulo(j),
      lat: k ? k.lat : c.lat, lon: k ? k.lon : c.lon, duracaoH: 3,
      preco: { v: 0, cur: c.moeda, label: 'Ingresso a definir' }, wiki: tour ? tour.wiki : '',
      site: j.ingressos || (k ? k.ingressos : ''), siteRotulo: 'Ingressos',
      tags: ['Futebol'], selecionado: false,
      desc: [j.comp, j.estadio || (k ? k.estadio : ''), F.dow(d) + ', ' + F.data(d) + (j.hora ? ' às ' + j.hora : '')].filter(Boolean).join(' · ') +
        '. Informe o valor do ingresso para ele entrar no orçamento.'
    };
  };

  function noOrcamento(j) {
    const App = A(), S = App.state, id = poiIdDe(j);
    if (!App.poi(id)) {
      App.addCustomPoi(Fut.pontoDe(j));
      S.pois[id].sel = true;
      if (App.cityDays(j.cityId).some(d => App.iso(d) === j.data)) S.pois[id].dia = j.data;   // fixa no dia do jogo
      window.UI.toast('Jogo adicionado aos pontos da cidade. Informe o valor do ingresso.', 5000);
    }
    App.openPoi(id);
  }

  /* ============================================================ painel da cidade */
  const esc = s => window.UI.esc(s);
  let form = null;        // { cityId, id (edição) | null, campos }
  const ext = '" target="_blank" rel="noopener noreferrer">';

  function jogoHtml(j) {
    const App = A(), F = window.Fmt, d = App.parseDate(j.data), s = Fut.situacao(j), k = Fut.clubeDe(j);
    const link = j.ingressos || (k ? k.ingressos : '');
    return '<li class="fut-jogo' + (s.ok ? ' ok' : '') + '">' +
      '<div class="fj-top"><b>' + esc(titulo(j)) + '</b><span>' + F.dow(d) + ', ' + F.data(d) + (j.hora ? ' · ' + esc(j.hora) : ' · hora a definir') + '</span></div>' +
      '<div class="fj-meta">' + esc([j.comp, j.estadio || (k ? k.estadio : '')].filter(Boolean).join(' · ')) +
      (j.origem === 'auto' ? ' <i title="Veio da football-data.org pelo seu Worker">automático</i>' : '') + '</div>' +
      '<p class="fj-sit' + (s.ok ? '' : ' warn') + '">' + (s.ok ? '✓ ' : '! ') + esc(s.texto) + '.</p>' +
      '<div class="fj-acts">' + (link ? '<a class="btn sm" href="' + esc(link) + ext + 'Ingressos ↗</a>' : '') +
      '<button type="button" class="btn sm" data-act="fut-poi" data-id="' + esc(j.id) + '">' + (App.poi(poiIdDe(j)) ? 'Ver no orçamento' : 'Pôr no orçamento') + '</button>' +
      (j.origem === 'meu' ? '<button type="button" class="btn sm" data-act="fut-edit" data-id="' + esc(j.id) + '">Editar</button>' +
        '<button type="button" class="btn sm" data-act="fut-del" data-id="' + esc(j.id) + '">Excluir</button>' : '') + '</div></li>';
  }

  function formHtml(c) {
    const f = form.campos, campo = (k, rot, tipo, extra) => '<div class="field"><label for="fj-' + k + '">' + rot + '</label><input id="fj-' + k + '" data-fid="fj-' + k + '" data-fj="' + k + '" type="' + tipo + '" value="' + esc(f[k] || '') + '"' + (extra || '') + '></div>';
    return '<div class="fut-form"><div class="fut-2">' + campo('data', 'Data', 'date') + campo('hora', 'Hora local', 'time') + '</div>' +
      '<div class="fut-2">' + campo('casa', 'Mandante', 'text', ' list="fj-clubes" placeholder="ex.: ' + esc((Fut.clubes(c.id)[0] || { nome: 'Time da casa' }).nome) + '"') + campo('fora', 'Visitante', 'text') + '</div>' +
      '<datalist id="fj-clubes">' + Fut.clubes(c.id).map(k => '<option value="' + esc(k.nome) + '">').join('') + '</datalist>' +
      '<div class="fut-2">' + campo('comp', 'Competição', 'text', ' placeholder="ex.: Premier League"') + campo('estadio', 'Estádio', 'text', ' placeholder="preenchido pelo clube"') + '</div>' +
      campo('ingressos', 'Link de ingressos', 'url', ' placeholder="https://…"') +
      '<div class="fj-acts"><button type="button" class="btn sm primary" data-act="fut-save">' + (form.id ? 'Salvar alterações' : 'Salvar jogo') + '</button>' +
      '<button type="button" class="btn sm" data-act="fut-cancel">Cancelar</button></div></div>';
  }

  Fut.cityHtml = function (c) {
    const App = A(), clubes = Fut.clubes(c.id), jogos = Fut.daCidade(c.id);
    if (!clubes.length && !jogos.length && !(form && form.cityId === c.id)) {
      return '<div class="fut-vazio"><button type="button" class="chip add" data-act="fut-add" data-id="' + c.id + '">+ Jogo de futebol nesta cidade</button></div>';
    }
    let html = '<h4>Futebol <small>' + (clubes.length ? clubes.length + (clubes.length === 1 ? ' clube' : ' clubes') : '') + (jogos.length ? (clubes.length ? ' · ' : '') + jogos.length + (jogos.length === 1 ? ' jogo' : ' jogos') : '') + '</small></h4>';
    if (jogos.length) html += '<ul class="fut-jogos">' + jogos.map(jogoHtml).join('') + '</ul>';
    else html += '<p class="muted">Nenhum jogo cadastrado nesta cidade. As tabelas só são confirmadas perto de cada rodada: veja o calendário do clube e cadastre o jogo aqui.</p>';
    if (form && form.cityId === c.id) html += formHtml(c);
    else html += '<div class="fj-acts"><button type="button" class="btn sm" data-act="fut-add" data-id="' + c.id + '">Adicionar jogo</button></div>';
    if (clubes.length) {
      html += '<ul class="fut-clubes">' + clubes.map(k => {
        const tour = k.poi ? App.poi(k.poi) : null;
        return '<li><div><b>' + esc(k.nome) + '</b><small>' + esc(k.liga + ' · ' + k.estadio) + '</small></div><div class="fc-links">' +
          '<a href="' + esc(k.calendario) + ext + 'Calendário ↗</a><a href="' + esc(k.ingressos) + ext + 'Ingressos ↗</a>' +
          (tour ? '<button type="button" data-act="open-poi" data-id="' + esc(tour.id) + '" title="' + esc(tour.nome) + '">Tour do estádio' + (App.poiActive(tour.id) ? ' ✓' : '') + '</button>' : '') +
          '</div></li>';
      }).join('') + '</ul>';
    }
    if (D.config.futebolProxyUrl && estadoAuto.erro) html += '<p class="muted">Não foi possível buscar os jogos automáticos agora (' + esc(estadoAuto.erro) + '). Os jogos cadastrados à mão continuam valendo.</p>';
    return html;
  };

  /* ============================================================ ações da interface */
  function abrirForm(cityId, j) {
    const App = A(), seg = App.calc.segByCity[cityId];
    form = { cityId, id: j ? j.id : null, campos: j ? { data: j.data, hora: j.hora, casa: j.casa, fora: j.fora, comp: j.comp, estadio: j.estadio, ingressos: j.ingressos }
      : { data: seg ? App.iso(seg.start) : App.state.dataSaida, hora: '', casa: '', fora: '', comp: '', estadio: '', ingressos: '' } };
    App.refresh();
  }

  function salvar() {
    if (!form) return;
    const App = A(), S = App.state, f = form.campos, UI = window.UI;
    const bruto = Object.assign({}, f, { id: form.id || '', cityId: form.cityId });
    const k = Fut.clubeDe(bruto);
    if (k) { bruto.clube = k.id; if (!bruto.estadio) bruto.estadio = k.estadio; }
    const j = Fut.limpar(bruto, 'meu');
    if (!j) { UI.toast('Preencha a data, o mandante e o visitante.'); return; }
    if (f.ingressos && !j.ingressos) { UI.toast('O link de ingressos precisa começar com https://'); return; }
    delete j.origem;
    const i = S.jogos.findIndex(x => x.id === j.id);
    if (i >= 0) S.jogos[i] = j; else S.jogos.push(j);
    form = null;
    App.refresh();
    UI.toast(Fut.situacao(j).texto + '.', 5000);
  }

  Fut.bind = function () {
    const UI = window.UI, App = A();
    const meu = id => App.state.jogos.find(j => j.id === id);
    UI.actions['fut-add'] = (t, id) => abrirForm(id, null);
    UI.actions['fut-edit'] = (t, id) => { const j = meu(id); if (j) abrirForm(j.cityId, j); };
    UI.actions['fut-cancel'] = () => { form = null; App.refresh(); };
    UI.actions['fut-save'] = salvar;
    UI.actions['fut-del'] = (t, id) => {
      const j = meu(id);
      if (!j || !window.confirm('Excluir o jogo ' + titulo(j) + '?')) return;
      App.state.jogos = App.state.jogos.filter(x => x.id !== id);
      App.refresh();
    };
    UI.actions['fut-poi'] = (t, id) => { const j = Fut.todos().find(x => x.id === id); if (j) noOrcamento(j); };
    // guarda o que foi digitado (o painel pode ser redesenhado enquanto o formulário está aberto)
    document.addEventListener('input', e => {
      const k = e.target && e.target.dataset && e.target.dataset.fj;
      if (k && form) form.campos[k] = e.target.value;
    });
  };

  /* ======================================== automático (opcional): Cloudflare Worker */
  const estadoAuto = { erro: '' };
  const pedidos = {};

  // Data e hora locais (do estádio) a partir do horário UTC da API.
  Fut.horaLocal = function (utc, fuso) {
    const d = new Date(utc);
    if (isNaN(d)) return null;
    try {
      const p = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: fuso || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(d).forEach(x => { p[x.type] = x.value; });
      return { data: p.year + '-' + p.month + '-' + p.day, hora: p.hour + ':' + p.minute };
    } catch (e) { return { data: d.toISOString().slice(0, 10), hora: d.toISOString().slice(11, 16) }; }
  };

  // Resposta da football-data.org (v4, /teams/{id}/matches) → jogos EM CASA do clube.
  Fut.resumir = function (json, clube) {
    const city = A().city(clube.cityId), fuso = D.fusos && D.fusos[city.paisIso];
    return ((json && json.matches) || []).filter(m => m && m.homeTeam && m.homeTeam.id === clube.fd && m.utcDate && m.status !== 'CANCELLED').map(m => {
      const h = Fut.horaLocal(m.utcDate, fuso);
      if (!h) return null;
      const semHora = /T00:00:00Z$/.test(m.utcDate);      // a API usa meia-noite UTC quando a hora ainda não saiu
      return { id: 'a-' + m.id, data: h.data, hora: semHora ? '' : h.hora, casa: m.homeTeam.shortName || m.homeTeam.name || clube.nome,
        fora: (m.awayTeam && (m.awayTeam.shortName || m.awayTeam.name)) || 'a definir', comp: (m.competition && m.competition.name) || clube.liga,
        estadio: clube.estadio, cityId: clube.cityId, clube: clube.id, ingressos: clube.ingressos };
    }).filter(Boolean);
  };

  // Busca os jogos dos clubes das cidades do roteiro (só com o proxy configurado; só o que falta).
  Fut.carregar = function () {
    const base = String(D.config.futebolProxyUrl || '').replace(/\/+$/, '');
    if (!/^https:\/\//.test(base)) return;
    const App = A();
    App.calc.route.forEach(cid => {
      const seg = App.calc.segByCity[cid];
      Fut.clubes(cid).filter(k => k.fd).forEach(k => {
        const de = App.iso(App.addDays(seg.start, -2)), ate = App.iso(App.addDays(seg.end, 2));
        const chave = k.id + '|' + de + '|' + ate;
        if (pedidos[chave]) return;
        pedidos[chave] = true;
        window.Net.getJSON(base + '/?team=' + k.fd + '&dateFrom=' + de + '&dateTo=' + ate, { fila: 'futebol', ttl: 12 * window.Net.HORA, reduzir: j => Fut.resumir(j, k) })
          .then(r => {
            estadoAuto.erro = '';
            auto[chave] = Array.isArray(r.data) ? r.data : [];
            if (auto[chave].length) App.refresh();
          })
          .catch(e => { estadoAuto.erro = e && e.message ? e.message : 'sem conexão'; });
      });
    });
  };
})();
