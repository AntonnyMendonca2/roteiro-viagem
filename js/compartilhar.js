/* ==========================================================================
   compartilhar.js — Feature 10: link de compartilhamento (sem servidor).

   O roteiro inteiro vai DENTRO do link, no hash (nada é enviado a servidor):

     https://usuario.github.io/repo/#r=1z<dados>
                                        ││
                                        │└ "z" = JSON compactado (deflate-raw) · "j" = JSON puro
                                        └─ versão do formato (links antigos continuam abrindo)

   <dados> = base64url do JSON só com o que difere do roteiro padrão.

   Links curtos (opcional): com DATA.config.linkCurtoUrl preenchido, o botão
   "Gerar link curto" guarda o "1z..." no Cloudflare Worker do usuário
   (worker/roteiro.js), depois do CAPTCHA (js/captcha.js), e o link leva só o
   código:  https://usuario.github.io/repo/#s=k7Qm2xPaB4
   Nada é gravado ao abrir a janela nem ao marcar opções: só no clique.
   Se o CAPTCHA ou o Worker falharem, o link continua o longo (#r=).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Comp = window.Compartilhar = {};
  Comp.VERSAO = 1;
  const clone = x => JSON.parse(JSON.stringify(x));
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);

  /* ============================================================ o que vai no link */
  // Tira hospedagens e valores de um estado (ou do retrato de um cenário).
  function limpar(o, raiz) {
    if (!isObj(o)) return;
    if (isObj(o.cities)) Object.keys(o.cities).forEach(id => { const c = o.cities[id]; if (isObj(c)) { delete c.hosp; delete c.custos; delete c.diaria; } });
    if (isObj(o.pois)) Object.keys(o.pois).forEach(id => { const p = o.pois[id]; if (isObj(p)) { delete p.valor; delete p.transporte; } });
    if (isObj(o.legs)) Object.keys(o.legs).forEach(k => { if (isObj(o.legs[k])) { delete o.legs[k].real; delete o.legs[k].link; } });
    if (raiz) {
      delete o.gerais; delete o.orcamento; delete o.spread; delete o.iof; delete o.divisao;
      if (isObj(o.assist)) delete o.assist.orcamento;
    }
  }

  // Tira do roteiro o que o app recria sozinho com o valor padrão (campos vazios dos trechos)
  // e limpa os links (parâmetros de rastreamento do Airbnb/Booking). Não muda o roteiro.
  function enxugar(o) {
    if (!isObj(o)) return;
    const hp = D.config.hospedagemPernoite, igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const link = u => (window.UI && window.UI.limparLink ? window.UI.limparLink(u) : u);
    if (isObj(o.legs)) Object.keys(o.legs).forEach(k => {
      const l = o.legs[k];
      if (!isObj(l)) return;
      if (l.link === '' || l.link == null) delete l.link; else l.link = link(l.link);
      if (l.pernoite === true) delete l.pernoite;
      if (isObj(l.hospedagem) && igual(l.hospedagem, hp)) delete l.hospedagem;
      if (isObj(l.real) && (l.real.v === '' || l.real.v == null)) delete l.real;
      ['horas', 'partida'].forEach(x => { if (isObj(l[x]) && !Object.keys(l[x]).length) delete l[x]; });
      if (isObj(l.mala) && l.mala.on === true && l.mala.v === D.config.malaLowCost.v && l.mala.cur === D.config.malaLowCost.cur) delete l.mala;
      if (isObj(l.res) && !l.res.st && !l.res.cod && !l.res.ate) delete l.res;
      if (!Object.keys(l).length) delete o.legs[k];
    });
    if (isObj(o.cities)) Object.keys(o.cities).forEach(id => {
      const h = isObj(o.cities[id]) && o.cities[id].hosp;
      if (!isObj(h)) return;
      if (typeof h.link === 'string') h.link = link(h.link);
      if (typeof h.nome === 'string' && /^https?:\/\//.test(h.nome)) h.nome = link(h.nome);
    });
  }
  Comp.enxugar = enxugar;

  // Objeto compacto do roteiro: só o que difere do padrão.
  // opts.privado: sem hospedagens e valores · opts.todos: leva todos os cenários (senão, só o ativo).
  Comp.montar = function (S, opts) {
    opts = opts || {};
    const T = A()._t, e = clone(S);
    // não fazem parte do roteiro: filtros da tela, sugestões ocultas, histórico do câmbio
    delete e.tag; delete e.ocultos; delete e.cambioInfo; delete e.cenComparar; delete e.cenNoMapa;
    // câmbio automático: quem abrir o link usa a cotação do dia dele
    if (e.cambioModo !== 'manual') { delete e.cambio; delete e.cambioModo; }
    if (!opts.todos) e.cenarios = e.cenarios.filter(c => c.id === e.cenarioAtivo);
    if (opts.privado) {
      limpar(e, true);
      e.cenarios.forEach(c => limpar(c.dados, false));
    }
    enxugar(e);
    e.cenarios.forEach(c => enxugar(c.dados));
    const out = T.diff(T.defaults(), e) || {};
    out.padrao = A().PADRAO;           // diz sobre qual padrão o link foi feito (links antigos não têm)
    return out;
  };

  // Estado completo a partir do objeto do link.
  Comp.estadoDe = function (obj) {
    const T = A()._t, o = clone(isObj(obj) ? obj : {});
    const base = T.padraoDe(o);                        // link antigo: lido em cima do padrão antigo
    return T.sanitize(T.merge(base, T.migrar(o)));
  };

  /* ============================================================ codificação */
  const temCS = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  function b64url(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deB64url(txt) {
    const bin = atob(txt.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function passar(bytes, fluxo) {
    const w = fluxo.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(fluxo.readable).arrayBuffer().then(b => new Uint8Array(b));
  }

  // objeto → "1z..." (ou "1j..." se o navegador não tiver CompressionStream, ou com opts.semCompactar)
  Comp.codificar = function (obj, opts) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    const puro = () => Comp.VERSAO + 'j' + b64url(bytes);
    if ((opts && opts.semCompactar) || !temCS()) return Promise.resolve(puro());
    return passar(bytes, new CompressionStream('deflate-raw'))
      .then(z => Comp.VERSAO + 'z' + b64url(z))
      .catch(puro);
  };

  // "1z..." → objeto (rejeita com uma mensagem em português se o link não servir)
  Comp.decodificar = function (txt) {
    return Promise.resolve().then(() => {
      const m = /^(\d+)([zj])([A-Za-z0-9_-]*)$/.exec(String(txt || '').trim());
      if (!m) throw new Error('O link está incompleto ou foi alterado.');
      if (+m[1] > Comp.VERSAO) throw new Error('Este link foi criado por uma versão mais nova do app. Atualize a página.');
      let bytes;
      try { bytes = deB64url(m[3]); } catch (e) { throw new Error('O link está incompleto ou foi alterado.'); }
      if (m[2] === 'j') return bytes;
      if (!temCS()) throw new Error('Este navegador não consegue abrir links compactados. Use um navegador mais novo.');
      return passar(bytes, new DecompressionStream('deflate-raw')).catch(() => { throw new Error('O link está incompleto ou foi alterado.'); });
    }).then(bytes => {
      let obj;
      try { obj = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { obj = null; }
      if (!isObj(obj)) throw new Error('O link está incompleto ou foi alterado.');
      return obj;
    });
  };

  const base = () => window.location.href.split('#')[0];
  const curtoUrl = () => { const u = String(D.config.linkCurtoUrl || '').trim().replace(/\/+$/, ''); return /^https:\/\//.test(u) ? u : ''; };
  Comp.temCurto = () => !!curtoUrl();

  // Guarda o roteiro codificado no Worker e devolve o código curto.
  // token: do Turnstile (js/captcha.js); o Worker recusa a gravação sem um token válido.
  Comp.guardar = function (cod, token) {
    const headers = { 'Content-Type': 'text/plain' };
    if (token) headers['X-Turnstile'] = token;
    return fetch(curtoUrl() + '/', { method: 'POST', headers, body: cod })
      .then(r => r.json().catch(() => ({})).then(j => {
        if (!r.ok || !j || !/^[A-Za-z0-9_-]{10}$/.test(j.id || '')) throw new Error(j && j.erro ? j.erro : 'o servidor respondeu ' + r.status);
        return j.id;
      }));
  };

  // Busca no Worker o roteiro de um link curto.
  Comp.buscar = function (id) {
    if (!curtoUrl()) return Promise.reject(new Error('Este site não está configurado para links curtos.'));
    return fetch(curtoUrl() + '/?id=' + encodeURIComponent(id))
      .catch(() => { throw new Error('Sem conexão com o servidor dos links.'); })
      .then(r => r.json().catch(() => ({})).then(j => {
        if (!r.ok || typeof j.codigo !== 'string') throw new Error(j && j.erro ? j.erro : 'O servidor respondeu ' + r.status + '.');
        return j.codigo;
      }));
  };

  // Link completo (#r=), sem rede: { url, longo, cod, compactado, curto: false, erroCurto: '' }
  Comp.link = function (opts) {
    return Comp.codificar(Comp.montar(A().state, opts), opts).then(cod => {
      const r = { url: base() + '#r=' + cod, cod, compactado: cod.charAt(1) === 'z', curto: false, erroCurto: '' };
      r.longo = r.url;
      return r;
    });
  };

  // Troca o link de r pelo curto (#s=): CAPTCHA → grava no Worker. Nunca rejeita:
  // se algo falhar, r continua com o link completo e r.erroCurto diz o motivo.
  // el: onde a caixa do CAPTCHA aparece, se a Cloudflare pedir interação.
  Comp.encurtar = function (r, el) {
    if (!curtoUrl() || r.curto) return Promise.resolve(r);
    r.erroCurto = '';
    return Promise.resolve().then(() => window.Captcha.token(el))
      .then(token => Comp.guardar(r.cod, token))
      .then(id => Object.assign(r, { url: base() + '#s=' + id, curto: true }))
      .catch(e => Object.assign(r, { erroCurto: e && e.message ? e.message : 'falha de rede' }));
  };

  /* ================================================================== mesclar */
  // Adiciona a S as cidades e os pontos de O que S não tem. Não mexe em valores nem no que já existe.
  Comp.mesclar = function (S, O) {
    let cidades = 0, pontos = 0;
    const cidadeDe = {};
    D.pois.forEach(p => { cidadeDe[p.id] = p.cityId; });
    // pontos criados pela outra pessoa
    O.customPois.forEach(p => {
      if (S.customPois.some(x => x.id === p.id)) return;
      S.customPois.push(clone(p));
      S.pois[p.id] = { sel: false, valor: clone(O.pois[p.id].valor), dia: '' };
    });
    S.customPois.forEach(p => { cidadeDe[p.id] = p.cityId; });
    // cidades que eu não tenho entram logo antes da minha última cidade (a de onde sai o voo de volta);
    // a rota inteligente reordena o miolo, se estiver ligada
    const sel = (st, id) => !!(st.cities[id] && st.cities[id].sel);
    const minhas = D.cities.filter(c => sel(S, c.id)).map(c => S.cities[c.id].ordem).sort((a, b) => a - b);
    const fim = minhas.length ? minhas[minhas.length - 1] : 0;
    const ini = minhas.length > 1 ? minhas[minhas.length - 2] : fim;      // com 0 ou 1 cidade, entram no fim
    const entram = D.cities.filter(c => sel(O, c.id) && !sel(S, c.id)).sort((a, b) => O.cities[a.id].ordem - O.cities[b.id].ordem);
    const novas = {};
    entram.forEach((c, i) => {
      S.cities[c.id].sel = true; S.cities[c.id].bv = ''; S.cities[c.id].noites = O.cities[c.id].noites;
      S.cities[c.id].ordem = minhas.length > 1 ? ini + (fim - ini) * (i + 1) / (entram.length + 1) : fim + i + 1;
      novas[c.id] = true; cidades++;
    });
    // pontos: nas cidades novas vale a seleção de quem compartilhou; nas outras, só acrescenta
    Object.keys(O.pois).forEach(id => {
      const cid = cidadeDe[id], meu = S.pois[id], dele = O.pois[id];
      if (!cid || !meu || !sel(O, cid)) return;
      if (novas[cid]) { meu.sel = !!dele.sel; if (dele.sel) pontos++; }
      else if (dele.sel && !meu.sel) { meu.sel = true; pontos++; }
    });
    return { cidades, pontos };
  };

  /* ================================================== abrir um link compartilhado */
  let meu = null;            // o MEU roteiro, guardado enquanto vejo o compartilhado
  let recebido = null;       // o roteiro compartilhado (estado completo)
  let faixaAberta = true;
  Comp.vendo = () => !!recebido;

  function limparHash() {
    try { window.history.replaceState(null, '', base()); } catch (e) { window.location.hash = ''; }
  }

  function mostrar(estado, msg) {
    const App = A();
    App.state = estado;
    App.focus = null;
    window.UI.hideDetail();
    window.MapView.rebuildPois();
    App.refresh();
    window.MapView.fitRoute();
    Comp.renderFaixa();
    if (msg) window.UI.toast(msg.txt, msg.ms, msg.acao);
  }

  // Entra no modo leitura: mostra o roteiro do link sem salvar nada.
  Comp.receber = function (obj) {
    const App = A();
    if (!meu) meu = App.state;
    const e = Comp.estadoDe(obj);
    // sem câmbio no link → usa a cotação que este navegador já tem
    if (!isObj(obj.cambio)) { e.cambio = clone(meu.cambio); e.cambioModo = meu.cambioModo; e.cambioInfo = clone(meu.cambioInfo); }
    recebido = e;
    faixaAberta = true;
    App.somenteLeitura = true;
    mostrar(clone(e));
  };

  // Sai do modo leitura (sem mensagem). Usado também por importar/restaurar.
  Comp.encerrar = function () {
    recebido = null; meu = null;
    A().somenteLeitura = false;
    limparHash();
    Comp.renderFaixa();
  };

  function voltar() {
    const m = meu;
    Comp.encerrar();
    mostrar(m, { txt: 'Você voltou ao seu roteiro.' });
  }

  function usar() {
    if (!window.confirm('Substituir o SEU roteiro por este roteiro compartilhado?\n\nVocê poderá desfazer logo em seguida.')) return;
    const antes = meu, novo = clone(recebido);
    Comp.encerrar();
    mostrar(novo, { txt: 'Agora este é o seu roteiro.', ms: 9000, acao: { rotulo: 'Desfazer', fn: () => mostrar(antes, { txt: 'Seu roteiro anterior voltou.' }) } });
  }

  function mesclar() {
    const antes = clone(meu), S = meu, O = recebido;
    Comp.encerrar();
    A().state = S;
    const r = Comp.mesclar(S, O);
    const txt = r.cidades || r.pontos
      ? 'Mesclado: ' + r.cidades + (r.cidades === 1 ? ' cidade' : ' cidades') + ' e ' + r.pontos + (r.pontos === 1 ? ' ponto' : ' pontos') + ' entraram no seu roteiro.'
      : 'Nada a mesclar: você já tem todas as cidades e pontos deste roteiro.';
    mostrar(S, { txt, ms: 9000, acao: r.cidades || r.pontos ? { rotulo: 'Desfazer', fn: () => mostrar(antes, { txt: 'Mescla desfeita.' }) } : undefined });
  }

  Comp.renderFaixa = function () {
    const el = document.getElementById('sharebar');
    if (!el) return;
    el.classList.toggle('show', !!recebido);
    document.body.classList.toggle('vendo-link', !!recebido);
    el.classList.toggle('mini', !!recebido && !faixaAberta);
    if (!recebido) { el.innerHTML = ''; return; }
    el.innerHTML = faixaAberta
      ? '<div class="sb-txt"><b>Você está vendo um roteiro compartilhado</b><span>Nada foi salvo neste navegador. O que deseja fazer?</span></div>' +
        '<div class="sb-btns"><button type="button" class="btn sm" data-act="share-ver" title="Modo leitura: nada é salvo">Só visualizar</button>' +
        '<button type="button" class="btn sm primary" data-act="share-usar" title="Substitui o seu roteiro (com confirmação)">Usar este roteiro</button>' +
        '<button type="button" class="btn sm" data-act="share-mesclar" title="Adiciona ao seu roteiro as cidades e pontos que você não tem">Mesclar</button>' +
        '<button type="button" class="btn sm" data-act="share-voltar">Voltar ao meu</button></div>'
      : '<button type="button" class="sb-mini" data-act="share-abrir" title="Ver as opções">Roteiro compartilhado · <b>modo leitura</b> ▾</button>';
  };

  function lerHash() {
    const h = window.location.hash || '', m = /^#r=(.+)$/.exec(h), s = /^#s=([A-Za-z0-9_-]{10})$/.exec(h), e = /^#e=([A-Za-z0-9_-]{12})$/.exec(h);
    if (e) { limparHash(); window.Colab.entrar(e[1]); return; }
    if (!m && !s) return;
    if (s) window.UI.toast('Abrindo o roteiro compartilhado…', 2500);
    (s ? Comp.buscar(s[1]) : Promise.resolve(m[1])).then(Comp.decodificar).then(Comp.receber).catch(e => {
      limparHash();
      window.UI.toast('Não foi possível abrir o roteiro compartilhado. ' + (e && e.message ? e.message : ''), 7000);
    });
  }

  /* ========================================================= janela "Compartilhar" */
  const QR_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';   // versão fixa; só carrega ao abrir a janela
  let qrLib = null;
  function carregarQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!qrLib) {
      qrLib = new Promise((ok, falha) => {
        const s = document.createElement('script');
        s.src = QR_URL; s.async = true;
        s.onload = () => (window.qrcode ? ok(window.qrcode) : falha(new Error('qr')));
        s.onerror = () => { qrLib = null; falha(new Error('qr')); };
        document.head.appendChild(s);
      });
    }
    return qrLib;
  }

  // SVG do QR code (ou null se o texto não couber em um QR code).
  Comp.qrSvg = function (lib, texto) {
    try {
      const q = lib(0, 'L');
      q.addData(texto, 'Byte'); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
    } catch (e) { return null; }
  };

  let aberta = false, atual = null, pedido = 0;
  const opcoes = { privado: false, todos: false };

  function renderJanela() {
    const el = document.getElementById('sharebox');
    if (!el) return;
    el.classList.toggle('show', aberta);
    if (!aberta) { el.innerHTML = ''; return; }
    const S = A().state, n = S.cenarios.length, local = window.location.protocol === 'file:';
    el.innerHTML = '<div class="fc-head"><div><div class="kicker">Compartilhar</div><h3>Link do roteiro</h3></div>' +
      '<button type="button" class="fc-x" data-act="share-close" aria-label="Fechar">×</button></div>' +
      '<p class="sh-aviso"><b>Atenção:</b> o link leva o roteiro inteiro — cidades, pontos, datas, <b>hospedagens marcadas e todos os valores</b>. Quem tiver o link vê tudo. ' +
        (Comp.temCurto() ? 'Os dados ficam no próprio link. Com <b>Gerar link curto</b>, o roteiro fica guardado no servidor de links (Cloudflare) e o link leva só um código.' : 'Nada é enviado a servidor: os dados ficam no próprio link.') + '</p>' +
      '<label class="check"><input type="checkbox" data-share-opt="privado"' + (opcoes.privado ? ' checked' : '') + '><span>Não incluir hospedagens e valores</span></label>' +
      (n > 1 ? '<label class="check"><input type="checkbox" data-share-opt="todos"' + (opcoes.todos ? ' checked' : '') + '><span>Incluir todos os cenários <small>(' + n + '; sem marcar, vai só o cenário ativo: ' + window.UI.esc(window.Cenarios.ativo().nome) + ')</small></span></label>' : '') +
      '<input id="sh-link" class="sh-link" type="text" readonly value="Gerando o link…" aria-label="Link do roteiro">' +
      '<p id="sh-tam" class="muted"></p>' +
      '<div class="sh-btns"><button type="button" class="btn sm primary" data-act="share-copy">Copiar link</button>' +
      (Comp.temCurto() ? '<button type="button" id="sh-btn-curto" class="btn sm" data-act="share-curto" hidden>Gerar link curto</button>' : '') +
      (navigator.share ? '<button type="button" class="btn sm" data-act="share-native">Enviar…</button>' : '') + '</div>' +
      '<div id="sh-captcha" class="sh-captcha" hidden></div>' +
      (local ? '<p class="muted">Você abriu o app direto do arquivo (<code>file://</code>): este link só funciona neste computador. Publique no GitHub Pages para mandar a outras pessoas.</p>' : '') +
      '<div id="sh-qr" class="sh-qr"></div>' + window.Colab.html();
    gerar();
  }
  Comp.renderJanela = renderJanela;

  // Monta o link completo (sem rede). O curto só sai no botão "Gerar link curto".
  function gerar() {
    const meuPedido = ++pedido;
    atual = null;
    const btn = document.getElementById('sh-btn-curto');
    if (btn) btn.hidden = true;
    Comp.link(opcoes).then(r => {
      if (meuPedido !== pedido || !aberta) return;
      atual = r;
      mostrarLink(r, meuPedido);
    });
  }

  function mostrarLink(r, meuPedido) {
    const inp = document.getElementById('sh-link'), tam = document.getElementById('sh-tam'), qr = document.getElementById('sh-qr'), btn = document.getElementById('sh-btn-curto');
    if (!inp) return;
    inp.value = r.url;
    if (btn) { btn.hidden = r.curto; btn.disabled = false; btn.textContent = r.erroCurto ? 'Tentar o link curto de novo' : 'Gerar link curto'; }
    if (r.curto) tam.innerHTML = 'Link curto (' + r.url.length + ' caracteres). <button type="button" class="lnk" data-act="share-longo">Copiar o link completo</button> <small>— não depende do servidor</small>';
    else tam.textContent = (r.erroCurto ? 'Não foi possível gerar o link curto (' + r.erroCurto + '); este é o link completo. ' : '') +
      'Link com ' + r.url.length.toLocaleString('pt-BR') + ' caracteres' + (r.compactado ? ' (compactado)' : ' (sem compactar: este navegador não tem CompressionStream)') +
      (r.url.length > 2000 ? '. Alguns aplicativos de mensagem cortam links muito longos — prefira “Não incluir hospedagens e valores” ou só o cenário ativo' + (Comp.temCurto() ? ', ou use “Gerar link curto”' : ', ou configure os links curtos (veja o README)') + '.' : '.');
    qr.innerHTML = '<span class="muted">Gerando o QR code…</span>';
    carregarQr().then(lib => {
      if (meuPedido !== pedido || !document.getElementById('sh-qr')) return;
      const svg = Comp.qrSvg(lib, r.url);
      qr.innerHTML = svg ? '<div class="sh-qr-img">' + svg + '</div><span class="muted">Aponte a câmera do celular para abrir o roteiro.</span>'
        : '<span class="muted">O link ficou longo demais para um QR code. ' + (Comp.temCurto() ? 'Use “Gerar link curto”, marque' : 'Marque') + ' “Não incluir hospedagens e valores” ou envie só o cenário ativo.</span>';
    }).catch(() => { if (meuPedido === pedido && document.getElementById('sh-qr')) qr.innerHTML = '<span class="muted">QR code indisponível sem internet (o link acima funciona normalmente).</span>'; });
  }

  // Botão "Gerar link curto": CAPTCHA + gravação no Worker, uma vez por link.
  function encurtar(btn) {
    if (!atual || atual.curto) return;
    const meuPedido = pedido, r = atual;
    if (btn) { btn.disabled = true; btn.textContent = 'Gerando…'; }
    Comp.encurtar(r, document.getElementById('sh-captcha')).then(() => {
      if (meuPedido !== pedido || !aberta) return;
      mostrarLink(r, meuPedido);
      if (r.curto) window.UI.toast('Link curto pronto. Copie e mande.');
    });
  }

  function copiar(longo) {
    if (!atual) return;
    const UI = window.UI, inp = document.getElementById('sh-link'), url = longo ? atual.longo : atual.url;
    const ok = () => UI.toast(longo ? 'Link completo copiado.' : 'Link copiado.');
    const naMao = () => {
      try { inp.value = url; inp.focus(); inp.select(); if (document.execCommand('copy')) { ok(); inp.value = atual.url; return; } } catch (e) { /* segue */ }
      UI.toast('Não foi possível copiar sozinho: selecione o link e copie.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, naMao);
    else naMao();
  }

  Comp.abrir = function () {
    if (Comp.vendo()) { window.UI.toast('Você está vendo um roteiro compartilhado. Escolha “Usar este roteiro” ou “Voltar ao meu” antes de compartilhar.', 6000); return; }
    aberta = true; renderJanela();
  };
  Comp.fechar = function () { aberta = false; renderJanela(); };

  Comp.bind = function () {
    const UI = window.UI;
    UI.actions['share'] = () => Comp.abrir();
    UI.actions['share-close'] = () => Comp.fechar();
    UI.actions['share-copy'] = () => copiar(false);
    UI.actions['share-longo'] = () => copiar(true);
    UI.actions['share-curto'] = t => encurtar(t);
    UI.actions['share-native'] = () => {
      if (!atual || !navigator.share) return;
      navigator.share({ title: 'Roteiro de viagem', text: 'Veja o meu roteiro de viagem', url: atual.url }).catch(() => { /* cancelado pelo usuário */ });
    };
    UI.actions['share-ver'] = () => { faixaAberta = false; Comp.renderFaixa(); UI.toast('Modo leitura: você pode explorar à vontade; nada é salvo.', 5000); };
    UI.actions['share-abrir'] = () => { faixaAberta = true; Comp.renderFaixa(); };
    UI.actions['share-usar'] = usar;
    UI.actions['share-mesclar'] = mesclar;
    UI.actions['share-voltar'] = voltar;
    document.addEventListener('change', e => {
      const k = e.target && e.target.dataset && e.target.dataset.shareOpt;
      if (!k) return;
      opcoes[k] = e.target.checked;
      gerar();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && aberta) Comp.fechar(); });
    window.addEventListener('hashchange', lerHash);
  };

  // Chamado no fim da inicialização do app: abre o link, se houver um.
  Comp.iniciar = lerHash;
})();
