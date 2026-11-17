/* ==========================================================================
   tour.js — tour guiado na primeira visita (sem biblioteca externa).

   - Só na primeira visita (localStorage "viagem-europa:tour" = "visto"), depois da
     escolha de cookies (js/consent.js). Ao pular ou terminar, não aparece de novo;
     Dados → Rever o tour refaz.
   - "Pular tour" em todos os passos (e Esc). Voltar / Próximo e o contador.
   - Cada passo escurece a tela e deixa um "recorte" no elemento, com um balão.
   - Passos interativos: avançam sozinhos quando a pessoa faz a ação; "Próximo"
     também funciona (o tour faz a ação por ela).
   - O exemplo (Londres → Paris, Liverpool como bate-volta) é montado num cenário
     separado; no fim: "Ficar com este roteiro" ou "Começar do zero" (o roteiro
     anterior volta). Celular: a gaveta abre/fecha conforme o passo.
   - Os textos falam em "buscar hospedagem / passagens"; não citam parceiros.
   ========================================================================== */
(function () {
  'use strict';

  const A = () => window.App, U = () => window.UI, Cen = () => window.Cenarios;
  const Tour = window.Tour = {};
  const LS = 'viagem-europa:tour', LS_ANDAMENTO = 'viagem-europa:tour-andamento', NOME_CEN = 'Tour (exemplo)';

  function lerLS(k) { try { return window.localStorage.getItem(k || LS); } catch (e) { return null; } }
  function gravarLS(v, k) { try { if (v == null) window.localStorage.removeItem(k || LS); else window.localStorage.setItem(k || LS, v); } catch (e) { /* ok */ } }
  Tour.visto = () => lerLS() === 'visto';

  /* ------------------------------------------------------------ utilidades */
  const $ = s => document.querySelector(s);
  const titulo = txt => Array.prototype.find.call(document.querySelectorAll('#detail h4'), h => h.textContent.trim().indexOf(txt) === 0) || null;
  function depois(el, sel) { let x = el && el.nextElementSibling; while (x && !x.matches(sel)) x = x.nextElementSibling; return x; }
  const legEntre = (a, b) => ((A().calc && A().calc.legs) || []).find(l => (l.from === a && l.to === b) || (l.from === b && l.to === a));
  const tentar = fn => { try { fn(); } catch (e) { /* tela ainda não montada (ex.: testes) */ } };
  // a gaveta só existe no celular: na tela grande, abrir/fechar não pode mexer em nada
  const celular = () => !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  const gaveta = aberta => { if (celular()) U().abrirGaveta(aberta); };
  // preparar a tela: lateral numa aba, só o mapa, ou o painel de uma cidade
  const lateral = aba => tentar(() => { A().closeDetail(); U().irAba(aba || 'roteiro'); gaveta(true); });
  const soMapa = () => tentar(() => { A().closeDetail(); gaveta(false); });
  const cidade = id => tentar(() => { if (!A().focus || A().focus.id !== id) A().openCity(id); gaveta(true); });

  /* ---------------------------------------------------------------- passos
     alvo(): elemento, lista de elementos (o recorte cobre todos) ou retângulo {left, top, right, bottom}.
     pronto(): a ação do passo interativo já foi feita? fazer(): o "Próximo" faz por ela. */
  const PASSOS = [
    { id: 'inicio', titulo: 'Bem-vindo ao Mapa da Viagem',
      texto: 'Monte sua viagem pela Europa num mapa: escolha as cidades, veja quanto custa e em que dia você está em cada lugar. Quer um tour rápido, de uns 3 minutos? Ele usa um roteiro de exemplo e não mexe no seu.' },
    { id: 'origem', titulo: 'Saindo de',
      texto: 'Primeiro, de onde você sai. O aeroporto muda o tempo dos voos e as buscas de passagens; os destinos com voo direto aparecem marcados.',
      antes: () => lateral('roteiro'), alvo: () => { const s = $('#f-origem'); return s ? [s.closest('.field'), $('#origem-info')] : null; } },
    { id: 'cidades', titulo: 'Inserir cidades', livre: true,        // livre: dá para clicar no mapa e no painel
      texto: 'Clique numa cidade no mapa para abrir o painel dela e use “Incluir no roteiro”. Experimente com Londres e depois Paris. (Também dá para usar “Adicionar cidade”, na lateral.)',
      antes: soMapa,
      alvo: () => {
        const b = $('#detail [data-act="toggle-city"].primary');       // painel de uma cidade fora do roteiro: o botão
        if (b) return b;
        const r = A().viewRect(); return { left: r.x0 + 8, top: r.y0 + 8, right: r.x1 - 8, bottom: r.y1 - 8 };
      },
      pronto: () => A().state.cities.londres.sel && A().state.cities.paris.sel,
      // incluiu a primeira: o mapa deu zoom nela; volta para a Europa para dar para clicar na outra
      progresso: () => {
        const n = (A().state.cities.londres.sel ? 1 : 0) + (A().state.cities.paris.sel ? 1 : 0);
        if (n === 1 && vistaEuropa !== 1) { vistaEuropa = 1; setTimeout(() => { if (ativo && PASSOS[i].id === 'cidades') tentar(() => A().home()); }, 1600); }
        if (n !== 1) vistaEuropa = n;
      },
      fazer: () => { ['londres', 'paris'].forEach(id => tentar(() => { if (!A().state.cities[id].sel) A().toggleCity(id, true); })); A().refresh(); } },
    { id: 'noites', titulo: 'Noites e ordem',
      texto: 'Ajuste as noites em cada cidade com − e +. A rota inteligente reorganiza a ordem sozinha para gastar menos tempo.',
      antes: () => lateral('roteiro'), alvo: () => $('.itin .citycard') },
    { id: 'trecho', titulo: 'Trecho entre cidades',
      texto: 'Entre duas cidades, escolha trem ou avião e veja o tempo e o preço estimado. Nas companhias low-cost, o app avisa da mala paga. Já comprou? Coloque o Valor real. Experimente: troque este trecho para Avião.',
      antes: () => lateral('roteiro'),
      alvo: () => { const l = legEntre('londres', 'paris'); return l ? Array.prototype.find.call(document.querySelectorAll('.itin .leg'), li => Array.prototype.some.call(li.querySelectorAll('[data-leg]'), b => b.dataset.leg === l.key)) : null; },
      pronto: () => { const l = legEntre('londres', 'paris'); return !!l && l.modo === 'aviao'; },
      fazer: () => { const l = legEntre('londres', 'paris'); if (l) A().setLegMode(l.key, 'aviao'); } },
    { id: 'passeios', titulo: 'Passeios',
      texto: 'Cada cidade tem pontos de interesse. Marque um, por exemplo a Torre Eiffel: o preço entra no total e o ponto vai para o dia a dia.',
      antes: () => cidade('paris'),
      alvo: () => { const b = $('#detail [data-act="toggle-poi"][data-id="torre-eiffel"]'); return b ? (b.closest('li') || b) : null; },
      pronto: () => !!A().state.pois['torre-eiffel'].sel,
      fazer: () => { if (!A().state.pois['torre-eiffel'].sel) A().togglePoi('torre-eiffel'); } },
    { id: 'valores', titulo: 'Preencher valores',
      texto: 'Mude o valor de um ponto e some os gastos na cidade (alimentação, compras…). Na aba Orçamento ficam os itens gerais e quanto você quer gastar.',
      antes: () => cidade('paris'),
      alvo: () => { const h = titulo('Gastos na cidade'); if (!h) return null; const l = [h]; let x = h.nextElementSibling; for (let k = 0; k < 4 && x && x.tagName !== 'H4'; k++, x = x.nextElementSibling) l.push(x); return l; } },
    { id: 'bv', titulo: 'Bate-volta',
      texto: 'Algumas cidades dá para visitar sem dormir lá. Com Londres no roteiro, inclua Liverpool como bate-volta: ele aparece como um cartão tracejado.',
      antes: () => lateral('roteiro'),
      alvo: () => $('[data-act="bv-set"][data-id="liverpool"][data-base="londres"]') || $('.itin .bvleg') || $('.itin .citycard[data-city="londres"]'),
      pronto: () => A().bvBase('liverpool', A().state) === 'londres',
      fazer: () => { if (A().bvBase('liverpool', A().state) !== 'londres') A().setBV('liverpool', 'londres'); } },
    { id: 'hosp', titulo: 'Hospedagem',
      texto: 'Busque hospedagem já com as datas do roteiro. Achou? Em “Minha hospedagem”, cole o link da reserva e o valor.',
      antes: () => cidade('londres'), alvo: () => { const h = titulo('Hospedagem'); return h ? [h, depois(h, '.links')] : null; } },
    { id: 'passagens', titulo: 'Passagens',
      texto: 'As buscas de passagens (e de trens, nos trechos) já abrem com as cidades e as datas preenchidas. É só comparar e comprar.',
      antes: () => cidade('londres'), alvo: () => { const h = titulo('Passagens aéreas'); return h ? [h, depois(h, '.fl-row')] : null; } },
    { id: 'reservas', titulo: 'Reservas',
      texto: 'Acompanhe cada item: a reservar → reservado → pago. Este quadro mostra o que ainda falta e avisa dos prazos.',
      antes: () => lateral('roteiro'), alvo: () => $('.resbox') },
    { id: 'total', titulo: 'Total, linha do tempo e comparativo',
      texto: 'No topo, o total da viagem e a barra do orçamento. Embaixo do mapa, a linha do tempo com os dias em cada cidade; e o comparativo mostra quanto custaria fazer tudo de trem ou de avião.',
      antes: () => lateral('roteiro'), alvo: () => $('#summary') },
    { id: 'fim', titulo: 'Compartilhar e editar junto',
      texto: 'Mande o roteiro por link ou crie um link de edição para planejar junto com alguém. Pronto! Quer ficar com este roteiro de exemplo?',
      antes: soMapa, alvo: () => $('#btn-share') }
  ];
  Tour.passos = PASSOS;

  /* ----------------------------------------------------------------- estado */
  let ativo = false, i = 0, anterior = '', exemplo = '', jaPronto = false, timer = null, el = null, avancando = null, vistaEuropa = 0, rolouEm = 0;
  Tour.ativo = () => ativo;
  Tour.passo = () => (ativo ? PASSOS[i].id : '');

  // Primeira visita? (não durante um link compartilhado, edição em conjunto ou link recebido)
  Tour.deveMostrar = function () {
    const App = A();
    return !Tour.visto() && !App.somenteLeitura && !(window.Colab && window.Colab.ativo()) && !/^#(r|s|e)=/.test(window.location.hash || '');
  };

  // A página fechou no meio do tour? Tira o cenário de exemplo e volta ao roteiro anterior.
  Tour.limparSobra = function () {
    let o = null;
    try { o = JSON.parse(lerLS(LS_ANDAMENTO) || 'null'); } catch (e) { o = null; }
    if (!o || !o.exemplo || ativo) return false;
    exemplo = o.exemplo; anterior = o.anterior || '';
    const S = A().state, havia = S.cenarios.some(x => x.id === exemplo);
    desfazerExemplo(false);
    gravarLS(null, LS_ANDAMENTO);
    if (havia) A().refresh();
    return havia;
  };

  // Chamado ao abrir o site: espera a escolha de cookies (o banner vem antes do tour).
  Tour.iniciar = function () {
    Tour.limparSobra();
    if (!Tour.deveMostrar()) return;
    const ir = () => setTimeout(() => { if (!ativo && Tour.deveMostrar()) Tour.comecar(); }, 700);
    if (window.Consent && !window.Consent.decidido()) document.addEventListener('consentimento', ir, { once: true });
    else ir();
  };

  Tour.comecar = function () {
    if (ativo) return;
    const UI = U();
    if (A().somenteLeitura) { UI.toast('Volte ao seu roteiro antes de fazer o tour.', 5000); return; }
    if (window.Colab && window.Colab.ativo()) { UI.toast('Saia da edição em conjunto antes do tour: o exemplo iria para todos que editam junto.', 6000); return; }
    ativo = true; i = 0; anterior = ''; exemplo = '';
    document.body.classList.add('tour-ativo');
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('resize', posicionar);
    timer = setInterval(tick, 350);
    montar();
    ir(0);
  };

  // Roteiro de exemplo num cenário separado (o do usuário fica guardado no cenário anterior).
  function criarExemplo() {
    const S = A().state, C = Cen();
    anterior = S.cenarioAtivo;
    const c = C.criar(NOME_CEN, {});
    exemplo = c.id;
    gravarLS(JSON.stringify({ exemplo, anterior }), LS_ANDAMENTO);   // para desfazer se a página fechar no meio
    C.ativar(S, c.id);
    A().refresh();
  }

  // Tira (ou guarda, com manter) o cenário de exemplo e volta ao cenário anterior.
  function desfazerExemplo(manter) {
    if (!exemplo) return;
    const S = A().state, C = Cen(), id = exemplo;
    exemplo = '';
    gravarLS(null, LS_ANDAMENTO);
    if (manter) {
      const c = S.cenarios.find(x => x.id === id);
      if (c) c.nome = 'Roteiro do tour';
      return;
    }
    if (S.cenarioAtivo === id) {
      const volta = S.cenarios.find(x => x.id === anterior) || S.cenarios.find(x => x.id !== id);
      if (volta) C.ativar(S, volta.id);
    }
    S.cenarios = S.cenarios.filter(x => x.id !== id);
    S.cenComparar = (S.cenComparar || []).filter(x => x !== id);
  }

  // manter = true: fica com o roteiro do exemplo (o cenário vira "Roteiro do tour").
  function encerrar(manter) {
    ativo = false;
    clearInterval(timer); clearTimeout(avancando);
    document.removeEventListener('keydown', tecla, true);
    window.removeEventListener('resize', posicionar);
    document.body.classList.remove('tour-ativo');
    if (el) { el.remove(); el = null; }
    gravarLS('visto');
    if (!exemplo) return;
    desfazerExemplo(manter);
    tentar(() => A().closeDetail());
    A().refresh();
    tentar(() => window.MapView.fitRoute());
  }

  Tour.pular = function () { if (!ativo) return; encerrar(false); tentar(() => U().toast('Tour encerrado. Para ver de novo: Dados → Rever o tour.', 5000)); };

  /* --------------------------------------------------------------- navegação */
  function ir(n) {
    i = Math.max(0, Math.min(PASSOS.length - 1, n));
    const p = PASSOS[i];
    if (p.antes) tentar(p.antes);
    jaPronto = !!(p.pronto && p.pronto());
    clearTimeout(avancando); avancando = null;
    render();
    // traz o alvo para a área visível (a lateral rola). Rolagem instantânea: a suave, junto com a animação
    // de zoom do mapa, chegou a congelar a página (o balão já desliza suave até o novo lugar).
    setTimeout(() => { const a = alvoEl(); if (a && a.scrollIntoView) tentar(() => a.scrollIntoView({ block: 'center' })); posicionar(); }, 120);
  }

  function proximo() {
    const p = PASSOS[i];
    if (p.pronto && p.fazer && !p.pronto()) tentar(p.fazer);
    if (i < PASSOS.length - 1) ir(i + 1);
  }

  // Passo interativo: a pessoa fez a ação → avança sozinho (com um "✓" rápido).
  function tick() {
    if (!ativo) return;
    const p = PASSOS[i];
    if (p.progresso) tentar(p.progresso);
    if (p.pronto && !jaPronto && !avancando && p.pronto()) {
      jaPronto = true;
      const ok = el && el.querySelector('.tr-ok');
      if (ok) ok.hidden = false;
      avancando = setTimeout(() => { avancando = null; if (ativo && PASSOS[i] === p) ir(i + 1); }, 700);
    }
    posicionar();
  }

  function tecla(e) {
    if (e.key !== 'Escape' || !ativo) return;
    e.preventDefault(); e.stopImmediatePropagation();
    Tour.pular();
  }

  function acao(a) {
    if (a === 'fazer') { criarExemplo(); ir(1); }
    else if (a === 'pular') Tour.pular();
    else if (a === 'proximo') proximo();
    else if (a === 'voltar') ir(Math.max(1, i - 1));
    else if (a === 'ficar') { encerrar(true); tentar(() => U().toast('Pronto! O roteiro do tour ficou no cenário "Roteiro do tour".', 6000)); }
    else if (a === 'zero') { encerrar(false); tentar(() => U().toast('Exemplo apagado: o seu roteiro anterior voltou.', 5000)); }
  }

  /* -------------------------------------------------------------------- tela */
  function montar() {
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'tour';
    el.innerHTML = '<div class="tr-bl" data-b="t"></div><div class="tr-bl" data-b="b"></div><div class="tr-bl" data-b="l"></div><div class="tr-bl" data-b="r"></div>' +
      '<div class="tr-foco" aria-hidden="true"></div>' +
      '<div class="tr-balao" role="dialog" aria-modal="false" aria-labelledby="tour-t" aria-describedby="tour-x"></div>';
    el.addEventListener('click', e => { const t = e.target.closest('[data-tour]'); if (t) acao(t.dataset.tour); });
    document.body.appendChild(el);
  }

  function render() {
    if (!el) return;
    const p = PASSOS[i], b = el.querySelector('.tr-balao'), total = PASSOS.length - 1;
    let botoes;
    if (p.id === 'inicio') botoes = '<button type="button" class="btn primary" data-tour="fazer">Fazer o tour</button><button type="button" class="btn" data-tour="pular">Pular</button>';
    else if (p.id === 'fim') botoes = '<button type="button" class="btn" data-tour="voltar">Voltar</button><button type="button" class="btn primary" data-tour="ficar">Ficar com este roteiro</button><button type="button" class="btn" data-tour="zero">Começar do zero</button>';
    else botoes = '<button type="button" class="btn" data-tour="voltar"' + (i <= 1 ? ' disabled' : '') + '>Voltar</button><button type="button" class="btn primary" data-tour="proximo">Próximo</button>';
    b.innerHTML = '<div class="tr-top">' + (p.id === 'inicio' ? '<span class="tr-cont">Tour</span>' : '<span class="tr-cont">' + i + ' de ' + total + '</span>') +
      (p.id === 'inicio' ? '' : '<button type="button" class="tr-pular" data-tour="pular">Pular tour</button>') + '</div>' +
      '<h3 id="tour-t">' + p.titulo + ' <span class="tr-ok" hidden>✓</span></h3><p id="tour-x">' + p.texto + '</p>' +
      (p.pronto ? '<p class="tr-dica">' + (jaPronto ? 'Feito! Clique em Próximo.' : 'Faça a ação ou clique em Próximo para o tour fazer por você.') + '</p>' : '') +
      '<div class="tr-btns">' + botoes + '</div>';
    posicionar();
    const f = b.querySelector('[data-tour="proximo"], [data-tour="fazer"], [data-tour="ficar"]');
    if (f) tentar(() => f.focus({ preventScroll: true }));
  }

  function alvoEl() {
    const a = PASSOS[i].alvo ? (function () { try { return PASSOS[i].alvo(); } catch (e) { return null; } })() : null;
    if (Array.isArray(a)) return a.find(Boolean) || null;
    return a && a.nodeType ? a : null;
  }

  // Retângulo do alvo (união, se for uma lista). null = sem alvo (balão no centro).
  function alvoRect() {
    const p = PASSOS[i];
    if (!p.alvo) return null;
    let a;
    try { a = p.alvo(); } catch (e) { a = null; }
    if (!a) return null;
    const rs = (Array.isArray(a) ? a.filter(Boolean) : [a]).map(x => (x.nodeType ? x.getBoundingClientRect() : x)).filter(r => r && r.right - r.left > 2 && r.bottom - r.top > 2);
    if (!rs.length) return null;
    return { left: Math.min(...rs.map(r => r.left)), top: Math.min(...rs.map(r => r.top)), right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
  }

  function posicionar() {
    if (!el) return;
    const W = window.innerWidth, H = window.innerHeight, PAD = 6;
    el.classList.toggle('tr-livre', !!PASSOS[i].livre);      // passo livre: a tela escurece, mas tudo continua clicável
    const r0 = alvoRect(), bl = k => el.querySelector('[data-b="' + k + '"]'), foco = el.querySelector('.tr-foco'), b = el.querySelector('.tr-balao');
    // só escreve quando muda: reescrever estilos a cada 350 ms refaz o layout da página inteira (pesado com o mapa cheio de fotos)
    const caixa = (x, l, t, w, h) => {
      const v = Math.round(l) + ',' + Math.round(t) + ',' + Math.round(Math.max(0, w)) + ',' + Math.round(Math.max(0, h));
      if (x.dataset.pos === v) return;
      x.dataset.pos = v;
      x.style.left = Math.round(l) + 'px'; x.style.top = Math.round(t) + 'px'; x.style.width = Math.round(Math.max(0, w)) + 'px'; x.style.height = Math.round(Math.max(0, h)) + 'px';
    };
    let r = null;
    if (r0) r = { left: Math.max(0, r0.left - PAD), top: Math.max(0, r0.top - PAD), right: Math.min(W, r0.right + PAD), bottom: Math.min(H, r0.bottom + PAD) };
    if (r && (r.bottom <= 0 || r.top >= H)) {                    // alvo fora da tela: rola até ele (no máximo 1 vez por segundo)
      r = null;
      const a = alvoEl();
      if (a && a.scrollIntoView && Date.now() - rolouEm > 1000) { rolouEm = Date.now(); tentar(() => a.scrollIntoView({ block: 'center' })); }
    }
    if (!r) {
      caixa(bl('t'), 0, 0, W, H); caixa(bl('b'), 0, 0, 0, 0); caixa(bl('l'), 0, 0, 0, 0); caixa(bl('r'), 0, 0, 0, 0);
      if (foco.style.display !== 'none') foco.style.display = 'none';
    } else {
      caixa(bl('t'), 0, 0, W, r.top); caixa(bl('b'), 0, r.bottom, W, H - r.bottom);
      caixa(bl('l'), 0, r.top, r.left, r.bottom - r.top); caixa(bl('r'), r.right, r.top, W - r.right, r.bottom - r.top);
      if (foco.style.display !== 'block') foco.style.display = 'block';
      caixa(foco, r.left, r.top, r.right - r.left, r.bottom - r.top);
    }
    // balão: no celular, na metade da tela oposta ao alvo; na tela grande, ao lado (lateral) ou acima/abaixo
    const bw = Math.min(360, W - 24);
    if (b.style.width !== bw + 'px') b.style.width = bw + 'px';
    const bh = b.offsetHeight || 200;
    let left, top;
    // passo com alvo que ainda não apareceu (painel abrindo, lista rolando): o balão fica onde estava
    if (!r && PASSOS[i].alvo && b.style.left) return;
    if (!r) { left = (W - bw) / 2; top = Math.max(12, (H - bh) / 2); }
    else if (W <= 820) {
      left = (W - bw) / 2;
      top = (r.top + r.bottom) / 2 > H / 2 ? 12 : H - bh - 12;
      if (r.bottom - r.top > H * 0.6) top = 12;
    } else if (r.left > W / 2 && r.left - bw - 16 > 0) {
      left = r.left - bw - 16; top = Math.min(Math.max(12, r.top), H - bh - 12);
    } else if (r.bottom + bh + 12 < H) { left = Math.min(Math.max(12, r.left), W - bw - 12); top = r.bottom + 12; }
    else if (r.top - bh - 12 > 0) { left = Math.min(Math.max(12, r.left), W - bw - 12); top = r.top - bh - 12; }
    else { left = 24; top = 24; }
    const bl2 = Math.round(left) + 'px', bt = Math.round(Math.max(12, top)) + 'px';
    if (b.style.left !== bl2) b.style.left = bl2;
    if (b.style.top !== bt) b.style.top = bt;
  }

  // Para os testes.
  Tour._t = { acao, tick, LS, LS_ANDAMENTO, NOME_CEN, encerrar };
})();
