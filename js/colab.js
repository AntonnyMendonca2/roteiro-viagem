/* ==========================================================================
   colab.js — edição em conjunto (link #e=<código>).

   Usa o mesmo Cloudflare Worker dos links curtos (worker/roteiro.js, rota /doc).
   O roteiro fica guardado no KV com um número de versão:
     - cada mudança é enviada ~1,5 s depois (PUT com a versão em que ela se baseia);
     - se alguém salvou antes (409), o app MESCLA: aplica as minhas mudanças
       (diferença entre a última versão sincronizada e o meu estado) sobre a
       versão nova e tenta de novo — mudanças em campos diferentes não se perdem;
       no mesmo campo, vale a última a chegar;
     - a cada ~12 s (e ao voltar para a aba) busca a versão nova dos outros.
   Câmbio, filtros e preferências da tela continuam pessoais (não são sincronizados).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const A = () => window.App;
  const Comp = () => window.Compartilhar;
  const Colab = window.Colab = {};

  const LS = 'viagem-europa:colab', LS_ANTES = 'viagem-europa:v1:antes-colab', LS_APP = 'viagem-europa:v1';
  const PESSOAL = ['cambio', 'cambioModo', 'cambioInfo', 'spread', 'iof', 'tag', 'ocultos', 'cenComparar', 'cenNoMapa'];
  const ESPERA_MS = 1500, POLL_MS = 12000;
  const clone = x => JSON.parse(JSON.stringify(x));

  let cfg = null;                 // { id, v, base }  base = JSON da última versão sincronizada
  let timer = null, poll = null, enviando = false, deNovo = false, aplicando = false;
  Colab.status = '';              // 'ok' | 'enviando' | 'erro' | 'offline'
  Colab.quando = 0;               // hora da última sincronização

  const url = () => { const u = String(D.config.linkCurtoUrl || '').trim().replace(/\/+$/, ''); return /^https:\/\//.test(u) ? u : ''; };
  Colab.disponivel = () => !!url();
  Colab.ativo = () => !!cfg;
  Colab.id = () => (cfg ? cfg.id : '');
  Colab.link = () => (cfg ? window.location.href.split('#')[0] + '#e=' + cfg.id : '');

  function lerLS(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function gravarLS(k, v) { try { if (v == null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, v); } catch (e) { /* ok */ } }
  const guardar = () => gravarLS(LS, cfg ? JSON.stringify(cfg) : null);

  /* ---------------------------------------------------------- funções puras */
  // O que é sincronizado: o roteiro inteiro (todos os cenários), sem o que é pessoal.
  Colab.dados = function (S) {
    const d = Comp().montar(S, { todos: true });
    PESSOAL.forEach(k => { delete d[k]; });
    if (Array.isArray(d.cenarios)) d.cenarios.forEach(c => { delete c.alterado; });   // carimbo de hora: não é mudança de verdade
    return d;
  };

  // Estado completo só com os campos sincronizados (para comparar e mesclar).
  function completo(dados) {
    const e = Comp().estadoDe(clone(dados || {}));
    PESSOAL.forEach(k => { delete e[k]; });
    (e.cenarios || []).forEach(c => { delete c.alterado; });
    return e;
  }

  // Mescla em três vias: as minhas mudanças (base → local) aplicadas sobre a versão remota.
  Colab.mesclar = function (base, local, remoto) {
    const T = A()._t, fb = completo(base), fl = completo(local), fr = completo(remoto);
    const minhas = T.diff(fb, fl);
    return minhas ? T.merge(fr, clone(minhas)) : fr;
  };

  /* ----------------------------------------------------------- rede */
  function pedir(metodo, query, corpo) {
    const o = { method: metodo };
    if (corpo) { o.headers = { 'Content-Type': 'application/json' }; o.body = JSON.stringify(corpo); }
    return fetch(url() + '/doc' + (query ? '?' + query : ''), o)
      .catch(() => { const e = new Error('Sem conexão com o servidor.'); e.rede = true; throw e; })
      .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, status: r.status, j })));
  }

  /* ----------------------------------------------------------- estado */
  // Troca o roteiro da tela pelos dados recebidos, mantendo o que é pessoal.
  function aplicar(dados) {
    const App = A(), atual = App.state, e = Comp().estadoDe(clone(dados));
    PESSOAL.forEach(k => { if (atual[k] !== undefined) e[k] = atual[k]; });
    App.state = e;
    aplicando = true;
    try {
      window.MapView.rebuildPois();
      App.refresh();
    } finally { aplicando = false; }
  }

  const atualJSON = () => JSON.stringify(Colab.dados(A().state));
  // Alguém está digitando no painel: não troca o estado debaixo dos dedos dele.
  const digitando = () => { const el = document.activeElement; return !!(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.closest('#sidebar')); };

  function marcar(st) { Colab.status = st; if (st === 'ok') Colab.quando = Date.now(); Colab.render(); }

  // Chamado a cada salvamento do app.
  Colab.mudou = function () {
    if (!cfg || aplicando || A().somenteLeitura) return;
    clearTimeout(timer);
    timer = setTimeout(enviar, ESPERA_MS);
  };

  function enviar() {
    if (!cfg) return;
    if (enviando) { deNovo = true; return; }
    const s = atualJSON();
    if (s === cfg.base) { marcar('ok'); return; }
    enviando = true; marcar('enviando');
    const id = cfg.id;
    pedir('PUT', 'id=' + encodeURIComponent(id) + '&base=' + cfg.v, { dados: JSON.parse(s) }).then(r => {
      if (!cfg || cfg.id !== id) return;
      if (r.ok) { cfg.v = r.j.v; cfg.base = s; guardar(); marcar('ok'); return; }
      if (r.status === 409 && r.j && r.j.dados) { mesclarCom(r.j.dados, r.j.v); deNovo = true; return; }
      if (r.status === 404) { perdido(); return; }
      marcar('erro'); setTimeout(enviar, 10000);
    }).catch(() => { marcar('offline'); setTimeout(enviar, 10000); })
      .then(() => { enviando = false; if (deNovo) { deNovo = false; enviar(); } });
  }

  // Versão nova dos outros + minhas mudanças ainda não enviadas.
  function mesclarCom(remoto, v) {
    const local = JSON.parse(atualJSON()), base = JSON.parse(cfg.base);
    const novo = Colab.mesclar(base, local, remoto);
    aplicar(Colab.dados(novo));
    cfg.v = v;
    cfg.base = JSON.stringify(Colab.dados(completo(remoto)));
    guardar();
  }

  function buscar() {
    if (!cfg || enviando || document.visibilityState === 'hidden') return;
    const id = cfg.id;
    pedir('GET', 'id=' + encodeURIComponent(id) + '&v=' + cfg.v).then(r => {
      if (!cfg || cfg.id !== id || enviando) return;
      if (r.status === 404) { perdido(); return; }
      if (!r.ok) { marcar('erro'); return; }
      if (r.j.igual || !(r.j.v > cfg.v)) { if (Colab.status !== 'enviando') marcar('ok'); return; }
      if (digitando()) return;                        // tenta de novo na próxima rodada
      const mudei = atualJSON() !== cfg.base;
      if (mudei) { mesclarCom(r.j.dados, r.j.v); enviar(); }
      else {
        aplicar(r.j.dados);
        cfg.v = r.j.v; cfg.base = atualJSON(); guardar();
        window.UI.toast('Roteiro atualizado com as mudanças de quem edita junto.', 3500);
      }
      marcar('ok');
    }).catch(() => marcar('offline'));
  }

  function ligarPoll() {
    clearInterval(poll);
    poll = setInterval(buscar, POLL_MS);
  }

  function perdido() {
    cfg = null; guardar(); clearInterval(poll);
    window.UI.toast('O roteiro de edição em conjunto não existe mais no servidor. Você continua com a sua cópia.', 8000);
    Colab.render();
  }

  /* ----------------------------------------------------------- ações */
  // Começa a editar junto a partir do roteiro atual.
  Colab.criar = function () {
    if (!Colab.disponivel()) return Promise.reject(new Error('Configure o Worker (veja "Links curtos" no README).'));
    const s = atualJSON();
    return pedir('POST', '', { dados: JSON.parse(s) }).then(r => {
      if (!r.ok || !r.j.id) throw new Error(r.j && r.j.erro ? r.j.erro : 'o servidor respondeu ' + r.status);
      cfg = { id: r.j.id, v: r.j.v, base: s };
      guardar(); ligarPoll(); marcar('ok');
      return Colab.link();
    });
  };

  // Entra num roteiro de edição em conjunto (link #e=).
  Colab.entrar = function (id) {
    const UI = window.UI;
    if (cfg && cfg.id === id) { buscar(); return Promise.resolve(); }
    if (!Colab.disponivel()) { UI.toast('Este site não está configurado para edição em conjunto.', 6000); return Promise.resolve(); }
    UI.toast('Abrindo o roteiro de edição em conjunto…', 2500);
    return pedir('GET', 'id=' + encodeURIComponent(id)).then(r => {
      if (!r.ok || !r.j.dados) throw new Error(r.j && r.j.erro ? r.j.erro : 'o servidor respondeu ' + r.status);
      if (!window.confirm('Entrar na edição em conjunto deste roteiro?\n\nO que você mudar aparece para quem tem o mesmo link (e vice-versa). ' +
        (cfg ? 'Você sai da edição em conjunto atual.' : 'O seu roteiro atual fica guardado e volta quando você sair.'))) return;
      if (!cfg) gravarLS(LS_ANTES, lerLS(LS_APP));
      cfg = { id, v: r.j.v, base: '' };
      aplicar(r.j.dados);
      cfg.base = atualJSON(); guardar(); ligarPoll(); marcar('ok');
      UI.toast('Você está editando junto. As mudanças são salvas sozinhas.', 6000);
    }).catch(e => UI.toast('Não foi possível abrir o roteiro de edição: ' + (e && e.message ? e.message : ''), 7000));
  };

  // Sai da edição em conjunto. voltar = true: volta ao roteiro que eu tinha antes de entrar.
  Colab.sair = function (voltar) {
    const App = A(), UI = window.UI, antes = lerLS(LS_ANTES);
    cfg = null; guardar(); clearInterval(poll); clearTimeout(timer);
    gravarLS(LS_ANTES, null);
    if (voltar && antes) {
      const e = App.lerPacote(antes);
      if (e) { App.state = e; window.MapView.rebuildPois(); App.refresh(); UI.toast('Você saiu da edição em conjunto e voltou ao seu roteiro.'); Colab.render(); return; }
    }
    App.refresh();
    UI.toast('Você saiu da edição em conjunto. Este roteiro continua aqui como uma cópia sua.');
    Colab.render();
  };
  Colab.temAnterior = () => !!lerLS(LS_ANTES);

  /* ----------------------------------------------------------- interface */
  // Selo na barra superior enquanto a edição em conjunto está ligada.
  Colab.render = function () {
    const el = document.getElementById('colabchip');
    if (!el) return;
    if (!cfg) { el.hidden = true; el.innerHTML = ''; return; }
    const t = { ok: 'sincronizado', enviando: 'salvando…', erro: 'erro ao salvar', offline: 'sem conexão' }[Colab.status] || 'conectando…';
    el.hidden = false;
    el.className = 'btn pill colab ' + (Colab.status || '');
    el.innerHTML = '<i aria-hidden="true"></i>Editando junto · <small>' + t + '</small>';
  };

  // Seção da janela "Compartilhar".
  Colab.html = function () {
    const esc = window.UI.esc;
    if (!Colab.disponivel()) return '';
    if (!cfg) {
      return '<div class="colab-box"><h4>Editar junto</h4><p class="muted">Gera um link de <b>edição</b>: quem abrir pode mudar o roteiro, e as mudanças aparecem para todos em poucos segundos. Diferente do link acima, que só mostra.</p>' +
        '<button type="button" class="btn sm" data-act="colab-criar">Criar link de edição</button></div>';
    }
    return '<div class="colab-box on"><h4>Editando junto</h4><p class="muted">Mande este link para quem vai editar com você. <b>Quem tiver o link pode mudar o roteiro.</b></p>' +
      '<input id="colab-link" class="sh-link" type="text" readonly value="' + esc(Colab.link()) + '" aria-label="Link de edição">' +
      '<div class="sh-btns"><button type="button" class="btn sm primary" data-act="colab-copiar">Copiar link de edição</button>' +
      (Colab.temAnterior() ? '<button type="button" class="btn sm" data-act="colab-sair-voltar">Sair e voltar ao meu roteiro</button>' : '') +
      '<button type="button" class="btn sm" data-act="colab-sair">Sair (fico com uma cópia)</button></div></div>';
  };

  function copiar(txt) {
    const UI = window.UI;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => UI.toast('Link de edição copiado.'), () => UI.toast('Selecione o link e copie.'));
    else UI.toast('Selecione o link e copie.');
  }

  Colab.bind = function () {
    const UI = window.UI;
    UI.actions['colab-criar'] = t => {
      t.disabled = true;
      Colab.criar().then(() => { Comp().renderJanela(); UI.toast('Link de edição criado. Copie e mande para quem vai editar com você.', 6000); })
        .catch(e => { t.disabled = false; UI.toast('Não foi possível criar o link de edição: ' + e.message, 7000); });
    };
    UI.actions['colab-copiar'] = () => copiar(Colab.link());
    UI.actions['colab-sair'] = () => { if (window.confirm('Sair da edição em conjunto?\n\nO roteiro continua aqui como uma cópia sua, mas as mudanças deixam de ser compartilhadas.')) { Colab.sair(false); Comp().renderJanela(); } };
    UI.actions['colab-sair-voltar'] = () => { if (window.confirm('Sair da edição em conjunto e voltar ao roteiro que você tinha antes?')) { Colab.sair(true); Comp().renderJanela(); } };
    UI.actions['colab-chip'] = () => Comp().abrir();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscar(); });
    window.addEventListener('online', () => { if (cfg) { enviar(); buscar(); } });
  };

  // Início: retoma a edição em conjunto salva neste navegador.
  Colab.iniciar = function () {
    try { cfg = JSON.parse(lerLS(LS) || 'null'); } catch (e) { cfg = null; }
    if (cfg && !(cfg.id && cfg.v)) cfg = null;
    if (cfg && Colab.disponivel()) { ligarPoll(); buscar(); enviar(); }
    Colab.render();
  };

  // Para os testes: estado interno.
  Colab._t = { aplicar, completo, set: c => { cfg = c; } };
})();
