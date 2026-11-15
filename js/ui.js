/* ==========================================================================
   ui.js — painéis, inputs, roteiro, orçamento, linha do tempo e legenda.

   Também define os utilitários compartilhados com o mapa:
   Fmt (formatação), ICONS (ícones SVG) e Photos (fotos da Wikipedia).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const UI = window.UI = {};
  UI.actions = {};                            // ações de clique registradas pelos módulos (data-act → função)
  const A = () => window.App;                 // App é criado depois (app.js)

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.esc = esc;

  /* ================================================================ formatação */
  const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const p2 = n => String(n).padStart(2, '0');

  const Fmt = window.Fmt = {
    brl: n => 'R$ ' + Math.round(n || 0).toLocaleString('pt-BR'),
    num: n => (+n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
    moeda: (v, cur) => {
      const s = D.simbolos[cur] || cur, n = Fmt.num(v);
      // símbolo antes: R$, €, £, CHF, ₺ · nas demais, o código depois do valor ("kr" e "L" são ambíguos)
      return ['BRL', 'EUR', 'GBP', 'CHF', 'TRY'].indexOf(cur) >= 0 ? s + (s.length > 1 ? ' ' : '') + n : n + ' ' + (cur === 'PLN' || cur === 'HUF' ? s : cur);
    },
    horas: h => {
      let hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60 / 5) * 5;
      if (mm === 60) { hh++; mm = 0; }
      return hh + 'h' + (mm ? p2(mm) : '');
    },
    // [2.33, 2.33] → "~2h20" · [16, 18] → "~16–18h"
    faixaH: h => {
      const a = h[0], b = h[h.length - 1];
      if (Math.abs(a - b) < 0.02) return '~' + Fmt.horas(a);
      const sa = Fmt.horas(a);
      return '~' + (sa.slice(-1) === 'h' ? sa.slice(0, -1) : sa) + '–' + Fmt.horas(b);
    },
    faixaEur: e => '€' + e[0] + '–' + e[1],
    data: d => p2(d.getUTCDate()) + '/' + p2(d.getUTCMonth() + 1),
    dow: d => DOW[d.getUTCDay()],
    sinal: (n, f) => (Math.abs(n) < 0.5 ? '=' : (n > 0 ? '+' : '−') + f(Math.abs(n)))
  };

  /* ==================================================================== ícones */
  const ICONS = window.ICONS = {
    // caminhos 24×24 (Material Icons, Apache 2.0)
    aviao: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    trem: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'
  };
  ICONS.onibus = 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z';
  ICONS.balsa = 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z';
  const icon = name => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
  const MODO = UI.MODO = { trem: 'Trem', onibus: 'Ônibus', balsa: 'Balsa', aviao: 'Avião' };
  UI.icon = icon;

  /* ===================================================== fotos (API da Wikipedia) */
  // As buscas passam pela fila "wiki" do net.js (no máximo 4 simultâneas, com intervalo — a
  // Wikipedia devolve erro 429 se for mais rápido) e o endereço da foto fica 30 dias no cache.
  const Photos = window.Photos = {
    cache: new Map(),       // título → Promise<url | null>
    get(title) {
      if (!title) return Promise.resolve(null);
      if (this.cache.has(title)) return this.cache.get(title);
      const url = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title);
      const p = window.Net.getJSON(url, { fila: 'wiki', ttl: 30 * window.Net.DIA, chave: 'foto:' + title,
        reduzir: j => (j && ((j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source))) || null })
        .then(r => r.data)
        .catch(() => { this.cache.delete(title); return null; });      // erro (429, sem internet): tenta de novo depois
      this.cache.set(title, p);
      return p;
    }
  };

  const iniciais = UI.iniciais = nome => nome.replace(/\(.*?\)/g, '').split(/[\s/–-]+/)
    .filter(w => w.length > 2 || /^[A-ZÀ-Ý0-9]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '•';

  // Bloco de foto: começa como placeholder com iniciais; a imagem entra quando carregar.
  UI.photo = (wiki, nome, cls) =>
    '<div class="photo ' + (cls || '') + '" data-wiki="' + esc(wiki || '') + '"><span>' + esc(iniciais(nome)) + '</span></div>';

  // Bloco de foto quando o endereço da imagem já é conhecido (ex.: resultados da Wikipedia).
  UI.photoUrl = (url, nome, cls) =>
    '<div class="photo loaded ' + (cls || '') + '"><span>' + esc(iniciais(nome)) + '</span>' + (url ? '<img src="' + esc(url) + '" alt="" loading="lazy">' : '') + '</div>';

  UI.hydratePhotos = function (root) {
    $$('.photo[data-wiki]', root).forEach(el => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      Photos.get(el.dataset.wiki).then(src => {
        if (!src || !el.isConnected) return;
        const img = new Image();
        img.alt = '';
        img.onload = () => { if (el.isConnected) { el.appendChild(img); el.classList.add('loaded'); } };
        img.src = src;
      });
    });
  };

  /* ============================ distância do ponto à hospedagem (ou ao centro) */
  // Distância e tempo a pé reais (pelas ruas) quando a matriz da cidade já foi buscada;
  // senão, estimativa em linha reta × 1,3 a 4,8 km/h. Veja ape.js.
  UI.dist = function (p) {
    const t = window.Ape.texto(p);
    return { km: t.r.km, curto: t.curto, longo: t.longo };
  };

  /* ====================================== links de busca (voos e hospedagem) */
  // Não usam API nem chave: abrem a busca já preenchida no site de cada empresa.
  const iataDe = id => (id === 'vcp' ? D.origem.iata : A().city(id).iata);
  const ext = '" target="_blank" rel="noopener noreferrer">';

  UI.linksVoo = function (from, to, date) {
    const a = iataDe(from), b = iataDe(to), iso = A().iso(date), n = D.config.viajantes || 1;
    return [
      { nome: 'Google Flights', url: 'https://www.google.com/travel/flights?q=' +
        encodeURIComponent('Flights from ' + a + ' to ' + b + ' on ' + iso + ' one way' + (n > 1 ? ' ' + n + ' adults' : '')) + '&hl=pt-BR&curr=BRL' },
      { nome: 'Skyscanner', url: 'https://www.skyscanner.com.br/transporte/passagens-aereas/' + a.toLowerCase() + '/' + b.toLowerCase() + '/' +
        iso.slice(2).replace(/-/g, '') + '/?adultsv2=' + n },
      { nome: 'Kayak', url: 'https://www.kayak.com.br/flights/' + a + '-' + b + '/' + iso + (n > 1 ? '/' + n + 'adults' : '') + '?sort=bestflight_a' }
    ];
  };

  UI.linksHosp = function (city, seg) {
    const App = A(), n = D.config.viajantes || 1, q = encodeURIComponent(city.wiki);
    const ci = seg ? App.iso(seg.start) : '', co = seg ? App.iso(seg.end) : '';
    return [
      { nome: 'Airbnb', url: 'https://www.airbnb.com.br/s/' + q + '/homes?' + (seg ? 'checkin=' + ci + '&checkout=' + co + '&' : '') + 'adults=' + n },
      { nome: 'Booking', url: 'https://www.booking.com/searchresults.pt-br.html?ss=' + q + (seg ? '&checkin=' + ci + '&checkout=' + co : '') +
        '&group_adults=' + n + '&no_rooms=1&selected_currency=BRL' },
      { nome: 'Hostelworld', url: 'https://www.hostelworld.com/hostels/europe/' + city.hostelworld + '/' }
    ];
  };

  const linkBtns = list => list.map(l => '<a class="btn" href="' + esc(l.url) + ext + esc(l.nome) + ' ↗</a>').join('');

  // Linhas de voo para uma cidade (trecho de chegada e, se for a última, a volta).
  UI.flightRows = function (cityId) {
    return A().flightsFor(cityId).map(f => {
      const trem = f.leg && f.leg.modo !== 'aviao' ? MODO[f.leg.modo].toLowerCase() : '';
      return '<div class="fl-row"><div class="fl-t"><b>' + esc(nomeDe(f.from)) + ' → ' + esc(nomeDe(f.to)) + '</b>' +
        '<small>' + Fmt.dow(f.date) + ', ' + Fmt.data(f.date) + (f.fora ? ' · cidade fora do roteiro' : '') +
        (trem ? ' · no roteiro este trecho é de ' + trem : '') + '</small></div>' +
        '<div class="links tight">' + linkBtns(UI.linksVoo(f.from, f.to, f.date)) + '</div></div>';
    }).join('');
  };

  // Card de passagens ao clicar num país do mapa.
  UI.showCountryCard = function (iso, nomePais, x, y) {
    const App = A(), card = els.flightcard;
    const doPais = D.cities.filter(c => c.paisIso === iso);
    const area = (D.infoAreas || [D.infoArea]).find(a => a.paisIso === iso);
    if (area && !area.aviso) return;
    const noRoteiro = doPais.filter(c => App.state.cities[c.id].sel);
    const lista = noRoteiro.length ? noRoteiro : doPais;
    const titulo = doPais.length ? doPais[0].pais : nomePais;
    card.innerHTML = '<div class="fc-head"><div><div class="kicker">' + (area ? 'Somente informativo' : 'Passagens aéreas') + '</div><h3>' + esc(area ? area.pais : titulo) + '</h3></div>' +
      '<button type="button" class="fc-x" data-act="fc-close" aria-label="Fechar">×</button></div>' +
      (area ? '<p class="alert forte">' + esc(area.aviso) + '</p><p class="muted">Este país aparece no mapa só como referência: não pode ser incluído no roteiro.</p>'
        : lista.length
        ? lista.map(c => UI.flightRows(c.id)).join('') +
          '<p class="muted">Os preços aparecem no site de cada buscador. Datas e cidades vêm do seu roteiro.</p>'
        : '<p class="muted">Nenhuma cidade deste país está cadastrada no roteiro.</p>');
    const w = Math.min(340, window.innerWidth - 24);
    card.style.width = w + 'px';
    card.classList.add('show');
    const h = card.offsetHeight;
    card.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, x - w / 2)) + 'px';
    card.style.top = Math.max(12, Math.min(window.innerHeight - h - 12, y - h - 14)) + 'px';
  };

  UI.hideCountryCard = function () {
    if (!els.flightcard || !els.flightcard.classList.contains('show')) return false;
    els.flightcard.classList.remove('show');
    return true;
  };

  // Lê coordenadas de um link do Google Maps ou de um texto "lat, lon".
  UI.parseLatLon = function (txt) {
    let s = String(txt || '').trim();
    try { s = decodeURIComponent(s); } catch (e) { /* ok */ }
    const num = '(-?\\d{1,3}(?:\\.\\d+)?)';
    const pats = [
      new RegExp('!3d' + num + '!4d' + num),                                     // marcador do local
      new RegExp('@' + num + ',' + num),                                          // centro do mapa
      new RegExp('[?&](?:q|query|ll|destination|center)=' + num + ',\\s*' + num),
      new RegExp('^' + num + '\\s*[,;\\s]\\s*' + num + '$')                         // "48.85, 2.35"
    ];
    for (const re of pats) {
      const m = re.exec(s);
      if (m) { const lat = +m[1], lon = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }; }
    }
    return null;
  };

  function hospPaste(cityId) {
    const App = A(), inp = $('#f-hosp-' + cityId);
    const v = inp ? inp.value.trim() : '';
    if (!v) { UI.toast('Cole um link do Google Maps ou as coordenadas (ex.: 48.8566, 2.3522).'); return; }
    const ll = UI.parseLatLon(v);
    if (!ll) {
      UI.toast(/goo\.gl|maps\.app/.test(v)
        ? 'Links curtos não trazem as coordenadas. No Google Maps, clique com o botão direito no local e copie as coordenadas, ou cole o link completo da barra do navegador.'
        : 'Não encontrei coordenadas nesse texto. Use um link completo do Google Maps ou "latitude, longitude".', 8000);
      return;
    }
    const km = App.distKm(App.city(cityId), ll);
    App.setHosp(cityId, ll.lat, ll.lon);
    UI.toast(km > 60 ? 'Hospedagem marcada, mas fica a ' + Math.round(km) + ' km de ' + App.city(cityId).nome + ' — confira.' : 'Hospedagem marcada.', km > 60 ? 6000 : 3200);
  }

  // Seção "Hospedagem" do painel da cidade.
  function hospSection(c) {
    const App = A(), cs = App.state.cities[c.id], seg = App.calc.segByCity[c.id], h = App.hosp(c.id);
    let html = '<h4>Hospedagem</h4>' +
      '<p class="ref">' + (seg ? 'Busca de ' + Fmt.data(seg.start) + ' a ' + Fmt.data(seg.end) + ' · ' : 'Sem datas (cidade fora do roteiro) · ') +
      (D.config.viajantes || 1) + ((D.config.viajantes || 1) > 1 ? ' pessoas' : ' pessoa') + '</p>' +
      '<div class="links tight">' + linkBtns(UI.linksHosp(c, seg)) + '</div>';
    if (!cs.sel) return html;
    html += '<div class="hosp-box"><div class="field"><label for="f-hn-' + c.id + '">Minha hospedagem <small>nome ou endereço</small></label>' +
      '<input type="text" id="f-hn-' + c.id + '" data-fid="f-hn-' + c.id + '" data-path="cities.' + c.id + '.hosp.nome" placeholder="Ex.: Generator Paris" value="' + esc(cs.hosp.nome) + '"></div>';
    if (h) {
      html += '<p class="hosp-ok">⌂ Marcada no mapa — as distâncias dos pontos são medidas a partir dela.</p>' +
        '<div class="links tight"><button type="button" class="btn" data-act="hosp-show" data-id="' + c.id + '">Ver no mapa</button>' +
        '<button type="button" class="btn" data-act="hosp-pick" data-id="' + c.id + '">Mudar local</button>' +
        '<a class="btn" href="https://www.google.com/maps/search/?api=1&amp;query=' + h.lat + ',' + h.lon + ext + 'Google Maps ↗</a>' +
        '<button type="button" class="btn" data-act="hosp-clear" data-id="' + c.id + '">Remover</button></div>';
    } else {
      html += '<button type="button" class="btn primary wide" data-act="hosp-pick" data-id="' + c.id + '">⌂ Marcar no mapa</button>' +
        '<div class="field"><label for="f-hosp-' + c.id + '">ou cole um link do Google Maps / coordenadas</label>' +
        '<div class="money-in"><input type="text" id="f-hosp-' + c.id + '" data-fid="f-hosp-' + c.id + '" placeholder="https://www.google.com/maps/… ou 48.85, 2.35">' +
        '<button type="button" class="btn" data-act="hosp-paste" data-id="' + c.id + '">Usar</button></div></div>';
    }
    return html + '</div>';
  }

  /* ============================================================ textos de trecho */
  const nomeDe = id => (id === 'vcp' ? D.origem.nomeCurto : A().city(id).nome);

  // Texto de um trecho em um modo (usado no painel e no hover do mapa).
  UI.legText = function (leg, modo) {
    const o = leg.opts[modo];
    let tempo = Fmt.faixaH(o.h);
    if (modo === 'aviao') tempo += o.extra ? ' de voo + ' + Fmt.horas(o.extra) + ' de aeroporto' : ' no total';
    const real = modo === leg.modo && leg.custo && leg.custo.real;
    let preco;
    if (real) preco = Fmt.moeda(A().num(leg.st.real.v), leg.st.real.cur) + ' (valor real)';
    else if (o.eur) preco = Fmt.faixaEur(o.eur);
    else preco = 'sem estimativa — informe o valor';
    return { titulo: nomeDe(leg.from) + ' → ' + nomeDe(leg.to), modo: MODO[modo], desc: o.desc, tempo, preco };
  };

  /* ================================================================ componentes */
  const curOptions = sel => D.moedas.map(m => '<option' + (m === sel ? ' selected' : '') + '>' + m + '</option>').join('');

  // Campo de valor + moeda, ligado ao estado por data-path (objeto { v, cur }).
  function money(label, path, hint) {
    const o = path.split('.').reduce((a, k) => (a ? a[k] : undefined), A().state) || { v: '', cur: 'BRL' };
    const fid = 'f-' + path;
    return '<div class="field money"><label for="' + esc(fid) + '">' + esc(label) + (hint ? '<small>' + hint + '</small>' : '') + '</label>' +
      '<div class="money-in"><input id="' + esc(fid) + '" data-fid="' + esc(fid) + '" type="number" min="0" step="any" inputmode="decimal" placeholder="0" ' +
      'data-path="' + esc(path) + '.v" value="' + esc(o.v === '' || o.v == null ? '' : o.v) + '">' +
      '<select data-path="' + esc(path) + '.cur" aria-label="Moeda">' + curOptions(o.cur) + '</select></div></div>';
  }

  const datasCidade = seg => Fmt.data(seg.start) + ' – ' + Fmt.data(seg.end);
  const noitesTxt = n => n + (n === 1 ? ' noite' : ' noites');

  /* ====================================================================== init */
  let els = {};
  let tab = 'roteiro';
  let toastTimer = null;

  UI.init = function () {
    els = {
      sidebar: $('#sidebar'), views: $('#views'), detail: $('#detail'), compare: $('#compare'),
      timeline: $('#timeline'), legend: $('#legend'), tags: $('#tags'), toast: $('#toast'),
      sumTotal: $('#sum-total'), sumPct: $('#sum-pct'), sumBudget: $('#sum-budget'),
      sumBar: $('#sum-bar'), sumDetails: $('#sum-details'), file: $('#file-import'), flightcard: $('#flightcard')
    };
    renderLegend();
    bind();
  };

  /* -------------------------------------------------------------------- eventos */
  function bind() {
    // cliques (delegação por data-act)
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const App = A(), id = t.dataset.id, act = t.dataset.act;
      switch (act) {
        case 'tab': tab = t.dataset.tab; App.closeDetail(); renderTabs(); openDrawer(true); break;
        case 'drawer': openDrawer(!document.body.classList.contains('drawer-open')); break;
        case 'sum-toggle': {
          const open = els.sumDetails.hidden;
          els.sumDetails.hidden = !open;
          t.setAttribute('aria-expanded', String(open));
          t.classList.toggle('open', open);
          break;
        }
        case 'open-city': App.openCity(id); break;
        case 'open-poi': App.openPoi(id); break;
        case 'toggle-city': App.toggleCity(id); break;
        case 'toggle-poi': App.togglePoi(id); break;
        case 'add-city': App.toggleCity(id, true); break;
        case 'up': App.moveCity(id, -1); break;
        case 'down': App.moveCity(id, 1); break;
        case 'n-dec': App.setNights(id, App.state.cities[id].noites - 1); break;
        case 'n-inc': App.setNights(id, App.state.cities[id].noites + 1); break;
        case 'mode': App.setLegMode(t.dataset.leg, t.dataset.mode); break;
        case 'back': {
          const f = App.focus;
          if (f && f.type === 'poi') App.openCity(App.poi(f.id).cityId); else App.closeDetail();
          break;
        }
        case 'fit-all': window.MapView.focusCity(id, true); break;
        case 'fit-core': window.MapView.focusCity(id); break;
        case 'tag': App.setTag(t.dataset.tag || null); break;
        case 'home': App.home(); break;
        case 'fit-route': App.closeDetail(); window.MapView.fitRoute(); break;
        case 'export': App.exportJSON(); break;
        case 'import': els.file.value = ''; els.file.click(); break;
        case 'reset': App.reset(); break;
        case 'optimize': App.optimizeNow(); break;
        case 'fc-close': UI.hideCountryCard(); break;
        case 'hosp-pick': App.pickHosp(id); break;
        case 'hosp-paste': hospPaste(id); break;
        case 'hosp-clear': App.state.cities[id].hosp.lat = null; App.state.cities[id].hosp.lon = null; App.refresh(); UI.toast('Hospedagem removida do mapa.'); break;
        case 'hosp-show': { openDrawer(false); window.MapView.showHosp(id); break; }
        case 'legend': els.legend.classList.toggle('open'); break;
        case 'day': if (id) App.openCity(id); break;
        default: if (UI.actions[act]) UI.actions[act](t, id, e);
      }
    });
    $('#btn-home').dataset.act = 'home';

    // digitação em campos de texto/número → atualização leve (sem recriar o formulário)
    els.sidebar.addEventListener('input', e => {
      const t = e.target;
      if (!t.dataset.path || t.type === 'checkbox' || t.type === 'date' || t.tagName === 'SELECT') return;
      let v = t.value;
      if (t.type === 'number') v = v === '' ? '' : parseFloat(v.replace(',', '.'));
      if (v !== '' && typeof v === 'number' && !isFinite(v)) return;
      A().set(t.dataset.path, v);
      A().refresh('light');
    });

    // selects, checkboxes e datas
    els.sidebar.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.otim) { A().setOtim(t.dataset.otim, t.type === 'checkbox' ? t.checked : t.value); return; }
      if (!t.dataset.path) return;
      if (t.type === 'checkbox') A().set(t.dataset.path, t.checked);
      else if (t.type === 'date') { if (!t.value) return; A().set(t.dataset.path, t.value); }
      else if (t.tagName === 'SELECT') A().set(t.dataset.path, t.value);
      else return;
      A().refresh('full' in t.dataset ? undefined : 'light');
    });

    // importar JSON
    els.file.addEventListener('change', () => {
      const f = els.file.files && els.file.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => A().importJSON(String(r.result));
      r.onerror = () => UI.toast('Não foi possível ler o arquivo.');
      r.readAsText(f);
    });

    // busca em "Adicionar cidade": esconde o que não combina, sem recriar a lista
    els.sidebar.addEventListener('input', e => {
      if (e.target.dataset.filtro) { UI.buscaCidade = e.target.value; filtrarCidades(); }
    });

    bindDrag();
  }

  const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filtrarCidades() {
    const q = semAcento(UI.buscaCidade || '').trim();
    $$('#add-cities .add-pais').forEach(g => {
      const pais = !q || semAcento(g.dataset.busca).indexOf(q) >= 0;
      let algum = false;
      $$('.chip', g).forEach(c => { const ok = pais || semAcento(c.dataset.busca).indexOf(q) >= 0; c.hidden = !ok; if (ok) algum = true; });
      g.hidden = !algum;
    });
  }

  // Reordenar cidades do roteiro arrastando os cartões.
  function bindDrag() {
    let dragId = null;
    const limpar = () => $$('.citycard', els.views).forEach(c => c.classList.remove('dragging', 'drop-before', 'drop-after'));
    els.views.addEventListener('dragstart', e => {
      const card = e.target.closest && e.target.closest('.citycard');
      if (!card) return;
      dragId = card.dataset.city;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* ok */ }
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    els.views.addEventListener('dragover', e => {
      if (!dragId) return;
      const card = e.target.closest('.citycard');
      if (!card) return;
      e.preventDefault();
      const r = card.getBoundingClientRect(), depois = e.clientY > r.top + r.height / 2;
      $$('.citycard', els.views).forEach(c => c.classList.remove('drop-before', 'drop-after'));
      if (card.dataset.city !== dragId) card.classList.add(depois ? 'drop-after' : 'drop-before');
    });
    els.views.addEventListener('drop', e => {
      const card = e.target.closest('.citycard');
      if (!dragId || !card) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const id = dragId; dragId = null; limpar();
      A().reorderCity(id, card.dataset.city, e.clientY > r.top + r.height / 2);
    });
    els.views.addEventListener('dragend', () => { dragId = null; limpar(); });
  }

  // Gaveta inferior (celular).
  function openDrawer(open) {
    if (document.body.classList.contains('drawer-open') === open) return;
    document.body.classList.toggle('drawer-open', open);
  }

  /* ==================================================================== toasts */
  UI.toast = function (msg, ms) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms || 3200);
  };

  /* ===================================================== contagem animada (total) */
  function countTo(el, to) {
    const from = el._val == null ? to : el._val;
    el._val = to;
    cancelAnimationFrame(el._raf);
    if (Math.round(from) === Math.round(to)) { el.textContent = Fmt.brl(to); return; }
    const t0 = performance.now(), dur = 650;
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = Fmt.brl(from + (to - from) * e);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* ============================================================ render: resumo */
  function barras(itens) {
    const max = Math.max.apply(null, itens.map(i => i.v).concat([1]));
    return itens.map(i => '<div class="bar-row"><span>' + esc(i.nome) + '</span><div class="bar"><i style="width:' +
      (i.v / max * 100).toFixed(1) + '%"></i></div><b>' + Fmt.brl(i.v) + '</b></div>').join('');
  }

  function renderSummary() {
    const App = A(), c = App.calc, orc = App.num(App.state.orcamento);
    countTo(els.sumTotal, c.total);
    const pct = orc > 0 ? c.total / orc * 100 : 0;
    els.sumPct.textContent = Math.round(pct) + '%';
    els.sumBudget.textContent = Fmt.brl(orc);
    els.sumBar.style.width = Math.min(100, pct) + '%';
    els.sumBar.parentNode.classList.toggle('over', pct > 100);
    els.sumPct.classList.toggle('over', pct > 100);

    const porCidade = c.route.map(id => ({ nome: App.city(id).nome, v: c.cities[id] }));
    const cat = c.cats;
    const porCat = [
      { nome: 'Hospedagem', v: cat.hospedagem }, { nome: 'Alimentação', v: cat.alimentacao },
      { nome: 'Atrações', v: cat.atracoes }, { nome: 'Compras', v: cat.compras },
      { nome: 'Transporte local', v: cat.transporteLocal }, { nome: 'Trechos (trem/avião)', v: cat.trechos },
      { nome: 'Itens gerais', v: cat.gerais }, { nome: 'Outros', v: cat.outros }
    ];
    els.sumDetails.innerHTML =
      '<h5>Por cidade</h5>' + (porCidade.length ? barras(porCidade) : '<p class="muted">Nenhuma cidade no roteiro.</p>') +
      '<h5>Por categoria</h5>' + barras(porCat) +
      (orc > 0 ? '<p class="muted">' + (c.total > orc ? 'Acima do orçamento em ' + Fmt.brl(c.total - orc) + '.' : 'Sobra ' + Fmt.brl(orc - c.total) + ' do orçamento.') + '</p>' : '') +
      window.Cambio.resumoHtml();
  }

  /* ======================================================= render: comparativo */
  function renderCompare() {
    const c = A().calc, cen = c.cen;
    const col = (k, titulo, ic) => {
      const s = cen[k], meu = k === 'meu';
      const dif = meu ? 'escolhas atuais'
        : Fmt.sinal(s.brl - cen.meu.brl, Fmt.brl) + ' · ' + Fmt.sinal(s.h - cen.meu.h, Fmt.horas);
      return '<div class="cmp' + (meu ? ' mine' : '') + '"><span class="cmp-t">' + ic + titulo + '</span>' +
        '<b>' + Fmt.brl(s.brl) + '</b>' +
        '<span class="cmp-h">' + Fmt.horas(s.h) + (s.noites ? ' · +' + s.noites + ' noite' : '') + '</span>' +
        '<em>' + dif + '</em></div>';
    };
    els.compare.innerHTML = '<h4>Comparativo de transporte <small>total entre cidades · diferença p/ o meu roteiro</small></h4>' +
      (c.legs.length
        ? '<div class="cmp-grid">' + col('terrestre', 'Cenário terrestre', icon('trem')) + col('aviao', 'Cenário avião', icon('aviao')) + col('meu', 'Meu roteiro', '') + '</div>'
        : '<p class="muted">Inclua uma cidade para comparar os meios de transporte.</p>');
  }

  /* ==================================================== render: linha do tempo */
  function renderTimeline() {
    const App = A(), c = App.calc, S = App.state;
    // avisos de "fechado" por data (ex.: Louvre às terças)
    const avisos = {};
    App.pois().forEach(p => {
      const w = App.poiWarn(p);
      if (w) w.datas.forEach(d => { avisos[p.cityId + '|' + d] = p.nome + ': ' + w.texto; });
    });

    const html = c.segs.map(seg => {
      const dias = [];
      const n = Math.max(1, seg.nights);
      for (let i = 0; i < n; i++) dias.push(App.addDays(seg.start, i));
      let nome, cls = 'tl-seg ' + seg.type, id = '';
      if (seg.type === 'ida') nome = icon('aviao') + 'Ida';
      else if (seg.type === 'volta') nome = icon('aviao') + 'Volta';
      else if (seg.type === 'pernoite') { nome = esc(seg.nome) + ' <small>pernoite</small>'; id = seg.cityId || ''; }
      else { nome = esc(App.city(seg.cityId).nome); id = seg.cityId; }
      const foco = App.focus && App.focus.type === 'city' && App.focus.id === id && seg.type === 'cidade';
      return '<div class="' + cls + (foco ? ' on' : '') + '" style="flex-grow:' + n + '">' +
        '<div class="tl-name">' + nome + '</div><div class="tl-days">' +
        dias.map(d => {
          const w = seg.type === 'cidade' ? avisos[seg.cityId + '|' + App.iso(d)] : '';
          const wx = window.Clima.tlHtml(id, d);        // temperatura típica e ícone do clima
          return '<button type="button" class="tl-day' + (w ? ' warn' : '') + '" data-act="day" data-id="' + esc(id) + '" data-dia="' + App.iso(d) + '" title="' +
            esc(w || (Fmt.dow(d) + ', ' + Fmt.data(d) + (wx.titulo ? ' · ' + wx.titulo : ''))) + '"><i>' + Fmt.dow(d) + '</i><b>' + Fmt.data(d) + '</b>' + wx.html + (w ? '<u>!</u>' : '') + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    els.timeline.innerHTML = c.route.length ? '<div class="tl-track">' + html + '</div>' : '';
    void S;
  }

  /* ====================================================== render: filtro de tags */
  function renderTags() {
    const tag = A().state.tag;
    els.tags.innerHTML = '<button type="button" class="chip' + (!tag ? ' on' : '') + '" data-act="tag" data-tag="">Todos</button>' +
      D.tags.map(t => '<button type="button" class="chip' + (tag === t ? ' on' : '') + '" data-act="tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('');
  }

  /* =============================================================== render: abas */
  function renderTabs() {
    $$('.tabs button').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    els.views.innerHTML = tab === 'roteiro' ? viewRoteiro() : tab === 'orcamento' ? viewOrcamento() : viewDados();
    if (tab === 'roteiro' && UI.buscaCidade) filtrarCidades();
  }

  function legCard(leg) {
    const App = A(), key = esc(leg.key), o = leg.opts[leg.modo], tx = UI.legText(leg, leg.modo);
    const disp = App.MODOS.filter(m => leg.opts[m]);            // só os meios disponíveis neste trecho
    const btn = m => '<button type="button" data-act="mode" data-leg="' + key + '" data-mode="' + m + '" data-fid="m-' + key + '-' + m + '" class="' +
      (leg.modo === m ? 'on' : '') + '" aria-pressed="' + (leg.modo === m) + '">' + icon(m) + MODO[m] + '</button>';

    let html = '<li class="leg ' + leg.modo + '">' +
      '<div class="leg-head"><span class="leg-title">' + esc(tx.titulo) + '</span>' + (leg.est ? '<span class="est">estimativa</span>' : '') + '</div>';
    html += '<div class="seg" role="group" aria-label="Meio de transporte">' + disp.map(btn).join('') + '</div>';
    html += '<p class="leg-info">' + esc(tx.desc) + ' · ' + esc(tx.tempo) + (o.eur ? ' · ' + Fmt.faixaEur(o.eur) : '') +
      ' <b data-out="leg-cost:' + key + '"></b></p>';
    if (o.noturno) html += '<p class="leg-via">Há opção noturna (dorme a bordo e economiza uma diária).</p>';
    if (!leg.intl && (leg.aviso || disp.length === 1)) html += '<p class="warn-line">' + esc(leg.aviso || 'Somente ' + MODO[disp[0]].toLowerCase() + ' neste trecho.') + '</p>';
    if (o.vias.length && !o.pernoite) html += '<p class="leg-via">' + (o.vias.length > 1 ? 'Paradas em ' : 'Parada em ') + esc(o.vias.map(v => v.nome).join(', ')) + '</p>';
    if (o.pernoite && o.via) {
      html += '<label class="check"><input type="checkbox" data-full data-fid="pn-' + key + '" data-path="legs.' + key + '.pernoite"' + (leg.st.pernoite ? ' checked' : '') +
        '><span>Pernoitar em ' + esc(o.via.nome) + ' <small>(+1 noite)</small></span></label>';
      if (leg.st.pernoite) html += money('Hospedagem em ' + o.via.nome, 'legs.' + leg.key + '.hospedagem');
    }
    html += window.Trilhos.legHtml(leg);          // trem: horários reais e paisagens no caminho
    html += money('Valor real', 'legs.' + leg.key + '.real', leg.intl ? 'ou use "Voo internacional" no orçamento' : 'substitui a estimativa');
    void App;
    return html + '</li>';
  }

  // Texto de uma diferença no critério da rota inteligente (ex.: "3h10", "R$ 210", "450 km").
  UI.otimTxt = function (v, crit) {
    if (crit === 'tempo') return Fmt.horas(v);
    if (crit === 'custo') return Fmt.brl(v);
    return Math.round(v).toLocaleString('pt-BR') + ' km';
  };

  // Quadro "Rota inteligente" (caixeiro-viajante).
  function smartBox() {
    const App = A(), o = App.state.otim, c = App.calc.otim, n = App.calc.route.length;
    const tol = App.OTIM_TOL[c.crit];
    const pode = o.fixarPontas ? n >= 3 : n >= 2;
    let status = '';
    if (pode && c.diff > tol) {
      const nomes = c.ideal.map(id => App.city(id).nome).join(' → ');
      status = '<div class="sm-warn"><p>A ordem atual tem <b>' + UI.otimTxt(c.diff, c.crit) + ' a mais</b> que a melhor rota:<br><small>' + esc(nomes) + '</small></p>' +
        '<button type="button" class="btn pill primary" data-act="optimize" data-fid="btn-otim">Otimizar agora</button></div>';
    } else if (pode) {
      status = '<p class="sm-ok">✓ ' + (App.rotaAproximada(n) ? 'Rota aproximada: com tantas cidades, a ordem é calculada por heurística' : 'Esta é a melhor ordem') + ' (' + App.CRITERIOS[c.crit].toLowerCase() + ').</p>';
    }
    return '<section class="smart">' +
      '<div class="sm-head"><label class="check sm-auto"><input type="checkbox" data-otim="auto" data-fid="otim-auto"' + (o.auto ? ' checked' : '') +
        '><span><b>Rota inteligente</b> <small>reordena sozinha</small></span></label>' +
        '<select data-otim="criterio" data-fid="otim-crit" aria-label="Critério da rota">' +
        Object.keys(App.CRITERIOS).map(k => '<option value="' + k + '"' + (k === o.criterio ? ' selected' : '') + '>' + App.CRITERIOS[k] + '</option>').join('') +
        '</select></div>' +
      '<label class="check"><input type="checkbox" data-otim="fixarPontas" data-fid="otim-fix"' + (o.fixarPontas ? ' checked' : '') +
        '><span>Manter a 1ª e a última cidade <small>(chegada e saída dos voos internacionais' +
        (n >= 2 ? ': ' + esc(App.city(App.calc.route[0]).nome) + ' e ' + esc(App.city(App.calc.route[n - 1]).nome) : '') +
        '; para trocar, arraste outra cidade para o início ou o fim)</small></span></label>' +
      status + '</section>';
  }

  function viewRoteiro() {
    const App = A(), S = App.state, c = App.calc;
    const ida = c.segs[0], volta = c.segs[c.segs.length - 1];
    let html = '<div class="field inline"><label for="f-saida">Data de saída</label>' +
      '<input id="f-saida" data-fid="f-saida" type="date" data-full data-path="dataSaida" value="' + esc(S.dataSaida) + '"></div>';

    html += smartBox();
    html += '<ol class="itin">';
    html += '<li class="node">' + icon('aviao') + '<div><b>' + esc(D.origem.nome) + '</b><small>saída ' + Fmt.dow(ida.start) + ', ' + Fmt.data(ida.start) + '</small></div></li>';
    c.route.forEach((id, i) => {
      const city = App.city(id), seg = c.segByCity[id], n = S.cities[id].noites;
      html += legCard(c.legs[i]);
      html += '<li class="citycard" draggable="true" data-city="' + id + '">' +
        '<span class="grip" title="Arraste para reordenar" aria-hidden="true">⋮⋮</span>' +
        '<button type="button" class="cc-main" data-act="open-city" data-id="' + id + '">' +
          '<span class="cc-n">' + (i + 1) + '</span>' +
          '<span class="cc-t"><b>' + esc(city.nome) + '</b><small>' + Fmt.dow(seg.start) + ' ' + datasCidade(seg) + '</small></span>' +
          '<span class="cc-sub" data-out="city-sub:' + id + '"></span>' +
        '</button>' +
        '<div class="cc-ctl">' +
          '<div class="stepper" title="Noites"><button type="button" data-act="n-dec" data-id="' + id + '" data-fid="nd-' + id + '" aria-label="Menos uma noite"' + (n <= 1 ? ' disabled' : '') + '>−</button>' +
          '<span>' + noitesTxt(n) + '</span>' +
          '<button type="button" data-act="n-inc" data-id="' + id + '" data-fid="ni-' + id + '" aria-label="Mais uma noite">+</button></div>' +
          '<div class="arrows"><button type="button" data-act="up" data-id="' + id + '" data-fid="up-' + id + '" aria-label="Mover para cima"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" data-act="down" data-id="' + id + '" data-fid="dn-' + id + '" aria-label="Mover para baixo"' + (i === c.route.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" data-act="toggle-city" data-id="' + id + '" aria-label="Remover do roteiro" title="Remover do roteiro">×</button></div>' +
        '</div></li>';
    });
    if (c.route.length) html += legCard(c.legs[c.legs.length - 1]);
    else html += '<li class="empty">Nenhuma cidade no roteiro. Inclua uma abaixo ou clique em uma cidade no mapa.</li>';
    html += '<li class="node">' + icon('aviao') + '<div><b>' + esc(D.origem.nome) + '</b><small>volta ' + Fmt.dow(volta.start) + ', ' + Fmt.data(volta.start) + '</small></div></li>';
    html += '</ol>';

    const fora = D.cities.filter(ci => !S.cities[ci.id].sel);
    if (fora.length) {
      const paises = [];
      fora.forEach(ci => { if (paises.indexOf(ci.pais) < 0) paises.push(ci.pais); });
      paises.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      html += '<h4>Adicionar cidade <small>' + fora.length + ' destinos</small></h4>' +
        '<input type="text" id="f-busca-cidade" data-fid="f-busca-cidade" data-filtro="#add-cities" placeholder="Buscar cidade ou país…" autocomplete="off" value="' + esc(UI.buscaCidade || '') + '">' +
        '<div id="add-cities">' + paises.map(p => '<div class="add-pais" data-busca="' + esc(p.toLowerCase()) + '"><span>' + esc(p) + '</span><div class="chips wrap">' +
          fora.filter(ci => ci.pais === p).map(ci => '<button type="button" class="chip add" data-act="add-city" data-id="' + ci.id + '" data-busca="' + esc(ci.nome.toLowerCase()) + '">+ ' + esc(ci.nome) + '</button>').join('') +
          '</div></div>').join('') + '</div>';
    }
    return html;
  }

  function viewOrcamento() {
    const S = A().state;
    let html = '<div class="field"><label for="f-orc">Orçamento total (R$)</label>' +
      '<input id="f-orc" data-fid="f-orc" type="number" min="0" step="100" inputmode="decimal" data-path="orcamento" value="' + esc(S.orcamento) + '"></div>';
    html += '<h4>Itens gerais <b class="h-val" data-out="gerais"></b></h4>';
    html += D.gerais.map(g => money(g.nome, 'gerais.' + g.id)).join('');
    html += window.Clima.levarHtml();           // "o que levar", pelas mínimas da viagem
    html += window.Cambio.html();
    html += '<label class="check"><input type="checkbox" data-fid="f-iof" data-path="iof"' + (S.iof ? ' checked' : '') +
      '><span>Somar IOF ' + Fmt.num(D.config.iofPct) + '% <small>em valores em moeda estrangeira (além do spread)</small></span></label>';
    html += '<p class="muted">Os gastos de cada cidade (hospedagem, alimentação, transporte local, compras, outros) ficam no painel da cidade: clique nela no mapa ou em "Meu roteiro". Pontos de interesse só entram no total quando estão selecionados.</p>';
    return html;
  }

  function viewDados() {
    return '<h4>Salvar e carregar</h4>' +
      '<p class="muted">Suas escolhas ficam salvas automaticamente neste navegador. Exporte um arquivo para guardar uma cópia ou abrir em outro aparelho.</p>' +
      '<div class="btn-col">' +
      '<button type="button" class="btn" data-act="export">Exportar JSON</button>' +
      '<button type="button" class="btn" data-act="import">Importar JSON</button>' +
      '<button type="button" class="btn danger" data-act="reset">Restaurar padrão</button></div>' +
      '<h4>Rotas dos trens</h4>' +
      '<p class="muted">O traçado real das ferrovias é buscado aos poucos, só para os trechos do seu roteiro, e fica guardado neste navegador. Para ter tudo disponível sem internet, pré-carregue todos os trechos de trem da tabela (leva uns 2 minutos).</p>' +
      '<div class="btn-col"><button type="button" class="btn" data-act="rail-preload">Pré-carregar rotas dos trens</button></div>' +
      '<h4>Atalhos</h4>' +
      '<p class="muted"><kbd>Esc</kbd> fecha o painel e volta ao mapa da Europa inteira. Role ou use a pinça para dar zoom; arraste para mover o mapa.</p>' +
      '<p class="muted">As fotos vêm da Wikipedia e os preços são de referência — confira nos sites oficiais antes de comprar.</p>';
  }

  /* =========================================================== render: detalhes */
  function tagsHtml(tags) { return tags.map(t => '<span class="tag">' + esc(t) + '</span>').join(''); }

  function cityDetail(c) {
    const App = A(), S = App.state, cs = S.cities[c.id], seg = App.calc.segByCity[c.id];
    const todos = App.poisOf(c.id), tag = S.tag;
    const lista = tag ? todos.filter(p => p.tags.indexOf(tag) >= 0) : todos;
    const ativos = todos.filter(p => App.poiActive(p.id)).length;
    const temBV = todos.some(p => p.bateVolta);

    let html = UI.photo(c.wiki, c.nome, 'd-photo') + '<div class="d-body">' +
      '<div class="kicker">' + esc(c.pais) + ' · ' + esc(c.moeda) + '</div><h2>' + esc(c.nome) + '</h2>';
    if (cs.sel && seg) html += '<p class="d-meta">' + Fmt.dow(seg.start) + ' ' + datasCidade(seg) + ' · ' + noitesTxt(cs.noites) + ' · <b data-out="city-sub:' + c.id + '"></b></p>';
    else if (c.papel) html += '<p class="d-meta">' + esc(c.papel) + '</p>';
    html += '<button type="button" class="btn big' + (cs.sel ? '' : ' primary') + '" data-act="toggle-city" data-fid="tc-' + c.id + '" data-id="' + c.id + '">' +
      (cs.sel ? 'Remover cidade do roteiro' : '✓ Incluir cidade no roteiro') + '</button>';
    if (c.nota) html += '<p class="note">' + esc(c.nota) + '</p>';
    html += window.Clima.cityHtml(c);

    if (cs.sel) {
      html += '<h4>Gastos na cidade</h4>' + D.categorias.map(k => money(k.nome, 'cities.' + c.id + '.custos.' + k.id)).join('');
    }
    html += hospSection(c) + '<h4>Passagens aéreas</h4>' + UI.flightRows(c.id);

    html += '<h4>Pontos de interesse <small>' + ativos + ' de ' + todos.length + ' no roteiro' + (tag ? ' · filtro: ' + esc(tag) : '') + '</small></h4>';
    if (temBV) html += '<div class="chips wrap"><button type="button" class="chip" data-act="fit-core" data-id="' + c.id + '">Ver o centro</button>' +
      '<button type="button" class="chip" data-act="fit-all" data-id="' + c.id + '">Ver com bate-voltas</button></div>';
    html += '<ul class="poilist">' + (lista.length ? lista.map(p => {
      const on = App.poiActive(p.id), w = App.poiWarn(p);
      return '<li class="poirow' + (on ? ' on' : '') + '">' +
        '<button type="button" class="chk" data-act="toggle-poi" data-id="' + p.id + '" data-fid="tp-' + p.id + '" aria-pressed="' + on + '" aria-label="' +
        (on ? 'Remover do roteiro' : 'Incluir no roteiro') + '">✓</button>' +
        '<button type="button" class="pr-main" data-act="open-poi" data-id="' + p.id + '"><span class="pr-n">' + esc(p.nome) + (p.custom ? ' <i class="mine" title="Adicionado por você">meu</i>' : '') + (w ? ' <i class="wdot" title="' + esc(w.texto) + '">!</i>' : '') + '</span>' +
        '<span class="pr-m">' + esc(p.preco.label) + ' · ' + esc(UI.dist(p).curto) + (p.tags.length ? ' · ' + esc(p.tags.join(', ')) : '') + '</span></button></li>';
    }).join('') : '<li class="empty">Nenhum ponto com a tag "' + esc(tag) + '" nesta cidade.</li>') + '</ul>';
    html += window.Descobrir.cityHtml(c);
    return html + '</div>';
  }

  function poiDetail(p) {
    const App = A(), S = App.state, ps = S.pois[p.id], city = App.city(p.cityId);
    const on = App.poiActive(p.id), w = App.poiWarn(p);
    let html = UI.photo(p.wiki, p.nome, 'd-photo') + '<div class="d-body">' +
      '<div class="kicker">' + esc(city.nome) + ' · ' + esc(city.pais) + '</div><h2>' + esc(p.nome) + '</h2>' +
      '<p class="d-meta"><span class="st ' + (on ? 'on' : '') + '">' + (on ? 'Selecionado' : 'Não selecionado') + '</span>' + tagsHtml(p.tags) + '</p>' +
      '<button type="button" class="btn big' + (on ? '' : ' primary') + '" data-act="toggle-poi" data-fid="tpd-' + p.id + '" data-id="' + p.id + '">' +
      (on ? 'Remover do roteiro' : '✓ Incluir no roteiro') + '</button>' +
      window.Ape.poiHtml(p) +
      '<p class="desc">' + esc(p.desc) + '</p>';
    if (w) html += '<p class="alert ' + w.nivel + '">' + esc(w.texto) + '</p>';
    (p.avisos || []).forEach(a => { if (!(w && p.fechado && /Fechado/.test(a))) html += '<p class="alert leve">' + esc(a) + '</p>'; });

    html += '<h4>Valor</h4><p class="ref">Preço de referência: <b>' + esc(p.preco.label) + '</b>' + (p.nota ? ' — ' + esc(p.nota) : '') + '</p>';
    html += money('Valor', 'pois.' + p.id + '.valor', '<span data-out="poi-brl:' + p.id + '"></span>');
    if (p.bateVolta) {
      html += '<h4>Bate-volta</h4><p class="ref">' + esc(p.bateVolta.desc) + '</p>' +
        money('Transporte (ida e volta)', 'pois.' + p.id + '.transporte', '<span data-out="poi-tr:' + p.id + '"></span>');
    }
    if (!on) html += '<p class="muted">Os valores só entram no total quando o ponto está no roteiro.</p>';
    if (p.custom) html += '<p class="muted">Ponto adicionado por você. Informe o valor do ingresso acima (o padrão é 0).</p>';

    const dias = App.cityDays(p.cityId);
    if (dias.length) {
      html += '<div class="field"><label for="f-dia">Dia da visita</label><select id="f-dia" data-fid="f-dia" data-full data-path="pois.' + p.id + '.dia">' +
        '<option value="">A definir</option>' +
        dias.map(d => '<option value="' + App.iso(d) + '"' + (ps.dia === App.iso(d) ? ' selected' : '') + '>' + Fmt.dow(d) + ', ' + Fmt.data(d) + '</option>').join('') +
        '</select></div>';
    }
    // links externos: Google Maps (sem chave de API) e site oficial
    const ll = p.lat + ',' + p.lon, ext = '" target="_blank" rel="noopener noreferrer">';
    html += '<div class="links">' +
      '<a class="btn" href="https://www.google.com/maps/search/?api=1&amp;query=' + ll + ext + 'Ver no Google Maps ↗</a>' +
      '<a class="btn" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + ll + '&amp;travelmode=transit' + ext + 'Como chegar ↗</a>' +
      (p.site ? '<a class="btn" href="' + esc(p.site) + ext + (p.custom ? 'Wikipedia ↗' : 'Site oficial ↗') + '</a>' : '') + '</div>';
    if (p.custom) html += '<button type="button" class="btn danger wide del" data-act="poi-delete" data-id="' + esc(p.id) + '">Excluir este ponto</button>';
    return html + '</div>';
  }

  function infoDetail(i) {
    return UI.photo(i.wiki, i.nome, 'd-photo') + '<div class="d-body">' +
      '<div class="kicker">' + esc(D.infoArea.pais) + ' · somente informativo</div><h2>' + esc(i.nome) + '</h2>' +
      '<p class="alert forte">' + esc(i.aviso) + '</p><p class="desc">' + esc(i.desc) + '</p>' +
      '<p class="muted">Este ponto aparece no mapa só como referência: não pode ser incluído no roteiro e não entra no orçamento.</p></div>';
  }

  function renderDetail() {
    const App = A(), f = App.focus;
    if (!f) return;
    const obj = f.type === 'city' ? App.city(f.id) : f.type === 'poi' ? App.poi(f.id) : App.info(f.id);
    if (!obj) { App.focus = null; UI.hideDetail(); return; }
    const voltar = f.type === 'poi' ? '← ' + App.city(obj.cityId).nome : '← Voltar';
    els.detail.innerHTML = '<div class="d-bar"><button type="button" class="btn pill" data-act="back">' + esc(voltar) + '</button></div>' +
      (f.type === 'city' ? cityDetail(obj) : f.type === 'poi' ? poiDetail(obj) : infoDetail(obj));
    UI.hydratePhotos(els.detail);
  }

  let lastFocusKey = '';
  UI.showDetail = function () {
    const f = A().focus, key = f.type + ':' + f.id;
    renderDetail();
    renderOuts();
    renderTimeline();
    if (key !== lastFocusKey) els.detail.scrollTop = 0;
    lastFocusKey = key;
    document.body.classList.add('detail-open');
    openDrawer(true);
  };

  UI.hideDetail = function () {
    lastFocusKey = '';
    document.body.classList.remove('detail-open');
    if (A().calc) renderTimeline();
  };

  /* ================================================= saídas calculadas (data-out) */
  function renderOuts() {
    const App = A(), c = App.calc, S = App.state;
    const legs = {};
    c.legs.forEach(l => { legs[l.key] = l; });
    $$('[data-out]').forEach(el => {
      const i = el.dataset.out.indexOf(':');
      const kind = i < 0 ? el.dataset.out : el.dataset.out.slice(0, i), id = i < 0 ? '' : el.dataset.out.slice(i + 1);
      let txt = '';
      if (kind === 'city-sub') txt = Fmt.brl(c.cities[id] || 0);
      else if (kind === 'gerais') txt = Fmt.brl(c.cats.gerais);
      else if (kind === 'leg-cost' && legs[id]) {
        const r = legs[id].custo;
        txt = r.transporte || r.pernoite ? '≈ ' + Fmt.brl(r.transporte + r.pernoite) + (r.real ? ' (valor real)' : '') : '';
      } else if (kind === 'poi-brl' || kind === 'poi-tr') {
        const o = S.pois[id] && S.pois[id][kind === 'poi-brl' ? 'valor' : 'transporte'];
        txt = o && o.cur !== 'BRL' && App.num(o.v) ? '≈ ' + Fmt.brl(App.toBRL(o.v, o.cur)) : '';
      }
      el.textContent = txt;
    });
  }

  /* ==================================================================== legenda */
  function renderLegend() {
    const ic = n => '<svg viewBox="0 0 24 24" width="12" height="12" x="-6" y="-6"><path d="' + ICONS[n] + '"/></svg>';
    const sw = inner => '<svg class="lg-sw" viewBox="-20 -9 40 18" aria-hidden="true">' + inner + '</svg>';
    const itens = [
      [sw('<circle r="5.5" class="lg-acc"/><circle r="9" class="lg-ring"/>'), 'Cidade no roteiro'],
      [sw('<circle r="4.5" class="lg-neu"/>'), 'Cidade fora do roteiro'],
      [sw('<circle cx="-7" r="4" class="lg-acc"/><circle cx="7" r="4" class="lg-neu"/>'), 'Ponto selecionado / neutro'],
      [sw('<path d="M-18,3 Q0,6 18,3" class="lg-line"/><g class="lg-badge"><circle r="8"/>' + ic('trem') + '</g>'), 'Trecho por terra (trem, ônibus ou balsa)'],
      [sw('<path d="M-18,6 Q0,-12 18,6" class="lg-line"/><g class="lg-badge" transform="translate(0,-3)"><circle r="8"/>' + ic('aviao') + '</g>'), 'Trecho de avião'],
      [sw('<path d="M-18,0 H18" class="lg-alt"/>'), 'Alternativa (terra × avião)'],
      [sw('<path d="M-18,0 H18" class="lg-trip"/>'), 'Bate-volta'],
      [sw('<rect x="-16" y="-7" width="32" height="14" rx="2" class="lg-hatch"/><path d="M0,-6 L6,5 L-6,5 Z" class="lg-warn"/>'), 'Área informativa (não selecionável)']
    ];
    els.legend.innerHTML = '<button type="button" class="lg-btn" data-act="legend">Legenda</button><ul>' +
      itens.map(i => '<li>' + i[0] + '<span>' + i[1] + '</span></li>').join('') + '</ul>';
  }

  /* ============================================================ render: geral */
  // Atualização leve: só números e gráficos (mantém formulários e foco).
  UI.renderLight = function () {
    renderSummary();
    renderCompare();
    renderTimeline();
    renderOuts();
  };

  // Dados do clima chegaram da rede: redesenha (mantém rolagem e foco).
  UI.climaChegou = function () { UI.renderAll(); };

  // Atualização completa: recria abas e detalhes, preservando rolagem e foco.
  UI.renderAll = function () {
    const ae = document.activeElement;
    const fid = ae && ae.dataset ? ae.dataset.fid : null;
    const sv = els.views.scrollTop, sd = els.detail.scrollTop;
    const ss = els.views.parentNode.scrollTop;

    renderTags();
    renderTabs();
    renderDetail();
    renderSummary();
    renderCompare();
    renderTimeline();
    renderOuts();

    els.views.scrollTop = sv; els.detail.scrollTop = sd; els.views.parentNode.scrollTop = ss;
    if (fid) {
      const el = $$('[data-fid]').find(x => x.dataset.fid === fid);
      if (el && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    }
  };
})();
