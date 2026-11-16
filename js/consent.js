/* ==========================================================================
   consent.js — consentimento de cookies (LGPD) e Google Consent Mode v2.

   - Categorias: Necessários (sempre ligados: o roteiro guardado neste navegador),
     Anúncios e Medição. A escolha fica no localStorage, com data, e pode ser
     mudada em Dados → Privacidade e cookies ou no link "Cookies" do rodapé.
   - Aceitar, Recusar e Configurar têm o mesmo destaque (recusar não fica escondido).
   - Consent Mode v2: logo ao carregar, tudo "denied" no dataLayer; depois da
     escolha, "update". Nenhum script de anúncio ou medição carrega antes do aceite.
   - Europa (EEE, Reino Unido, Suíça): o Google exige uma plataforma de consentimento
     certificada. Com o AdSense ligado, quem está lá recebe a mensagem do PRÓPRIO
     Google (AdSense → Privacidade e mensagens) e o banner daqui não aparece:
     cada visitante vê um único aviso. Sem AdSense, o banner daqui vale para todos.
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const Consent = window.Consent = {};
  const LS = 'viagem-europa:consentimento', VERSAO = 1;

  Consent.CATEGORIAS = [
    { id: 'necessarios', nome: 'Necessários', fixo: true,
      desc: 'Guardam o seu roteiro, as suas preferências e esta escolha neste navegador. Sem eles o site não funciona; nada disso é usado para anúncios.' },
    { id: 'anuncios', nome: 'Anúncios',
      desc: 'Permitem que o Google e parceiros usem cookies para mostrar anúncios, inclusive com base em visitas a este e a outros sites. Ajudam a manter o site gratuito.' },
    { id: 'medicao', nome: 'Medição',
      desc: 'Estatísticas de uso (quantas pessoas visitam, quais partes usam), para melhorar o site. Hoje o site não usa nenhuma ferramenta de medição.' }
  ];

  /* ------------------------------------------------ Consent Mode v2 (Google) */
  // Antes de qualquer tag do Google: tudo negado. Só vale quando uma tag do Google for carregada.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });

  /* --------------------------------------------------------------- escolha */
  Consent.ler = function () {
    try {
      const o = JSON.parse(window.localStorage.getItem(LS) || 'null');
      if (o && o.v === VERSAO && typeof o.data === 'string') return o;
    } catch (e) { /* sem localStorage */ }
    return null;
  };
  Consent.permitido = cat => cat === 'necessarios' || !!(Consent.ler() || {})[cat];

  const adsense = () => String((D.config && D.config.adsenseCliente) || '').trim();
  // Visitante na Europa? (fuso horário do navegador; a CMP do Google, se carregada, também conta)
  Consent.naEuropa = function () {
    try { return /^Europe\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (e) { return false; }
  };
  // Quem cuida do consentimento é a mensagem do Google (só com AdSense ligado e visitante na Europa).
  Consent.googleCuida = () => !!adsense() && (typeof window.__tcfapi === 'function' || Consent.naEuropa());
  // Já há uma decisão (ou o Google cuida dela)? O tour (item 2) espera por isso.
  Consent.decidido = () => !!Consent.ler() || Consent.googleCuida();

  function sinal(on) { return on ? 'granted' : 'denied'; }
  function aplicar(o) {
    window.gtag('consent', 'update', { ad_storage: sinal(o.anuncios), ad_user_data: sinal(o.anuncios), ad_personalization: sinal(o.anuncios), analytics_storage: sinal(o.medicao) });
    carregarAnuncios();
    try { document.dispatchEvent(new CustomEvent('consentimento', { detail: o })); } catch (e) { /* navegador antigo */ }
  }

  Consent.salvar = function (escolha) {
    const o = { v: VERSAO, data: new Date().toISOString(), anuncios: !!escolha.anuncios, medicao: !!escolha.medicao };
    try { window.localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { /* vale só nesta visita */ }
    aplicar(o);
    Consent.fechar();
    return o;
  };
  Consent.aceitar = () => Consent.salvar({ anuncios: true, medicao: true });
  Consent.recusar = () => Consent.salvar({ anuncios: false, medicao: false });

  /* ------------------------------------------------------------- anúncios */
  // O script do AdSense só entra com AdSense configurado E (anúncios aceitos OU Europa, onde a
  // mensagem do Google pede o consentimento antes de qualquer anúncio personalizado).
  let carregado = false;
  Consent.anunciosCarregados = () => carregado;
  function carregarAnuncios() {
    if (carregado || !adsense()) return;
    if (!Consent.googleCuida() && !Consent.permitido('anuncios')) return;
    carregado = true;
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(adsense());
    document.head.appendChild(s);
    document.body.classList.add('com-anuncios');
  }

  /* --------------------------------------------------------------- banner */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let modo = '';          // '' (fechado) | 'banner' | 'config'

  function caixa() {
    let el = document.getElementById('consent');
    if (!el) {
      el = document.createElement('div');
      el.id = 'consent';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-labelledby', 'consent-t');
      document.body.appendChild(el);
      el.addEventListener('click', clique);
    }
    return el;
  }

  function render() {
    const el = caixa(), atual = Consent.ler() || { anuncios: false, medicao: false };
    el.className = modo ? 'show ' + modo : '';
    document.body.classList.toggle('consent-aberto', !!modo);
    if (!modo) { el.innerHTML = ''; return; }
    const links = '<a href="privacidade.html" target="_blank" rel="noopener">Privacidade</a> · <a href="como-e-mantido.html" target="_blank" rel="noopener">Como o site é mantido</a>';
    if (modo === 'banner') {
      el.innerHTML = '<div class="cs-txt"><b id="consent-t">Sua privacidade</b>' +
        '<p>O site guarda o seu roteiro neste navegador (necessário para funcionar). Com a sua permissão, também usa cookies de <b>anúncios</b> e de <b>medição</b>. Você pode mudar a escolha quando quiser. ' + links + '</p></div>' +
        '<div class="cs-btns"><button type="button" class="btn" data-cs="aceitar">Aceitar</button>' +
        '<button type="button" class="btn" data-cs="recusar">Recusar</button>' +
        '<button type="button" class="btn" data-cs="config">Configurar</button></div>';
    } else {
      const d = Consent.ler();
      el.innerHTML = '<div class="cs-txt"><b id="consent-t">Privacidade e cookies</b>' +
        '<p>' + (d ? 'Escolha salva em ' + new Date(d.data).toLocaleDateString('pt-BR') + '. ' : '') + 'Marque o que você permite. ' + links + '</p></div>' +
        '<div class="cs-cats">' + Consent.CATEGORIAS.map(c => '<label class="cs-cat"><input type="checkbox" data-cs-cat="' + c.id + '"' +
          (c.fixo || atual[c.id] ? ' checked' : '') + (c.fixo ? ' disabled' : '') + '><span><b>' + esc(c.nome) + (c.fixo ? ' <small>sempre ligados</small>' : '') + '</b>' +
          '<small>' + esc(c.desc) + '</small></span></label>').join('') + '</div>' +
        '<div class="cs-btns"><button type="button" class="btn" data-cs="salvar">Salvar escolhas</button>' +
        '<button type="button" class="btn" data-cs="aceitar">Aceitar tudo</button>' +
        '<button type="button" class="btn" data-cs="recusar">Recusar tudo</button></div>';
    }
    const b = el.querySelector('button');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  }

  function clique(e) {
    const t = e.target.closest('[data-cs]');
    if (!t) return;
    const a = t.dataset.cs;
    if (a === 'aceitar') Consent.aceitar();
    else if (a === 'recusar') Consent.recusar();
    else if (a === 'config') Consent.abrir('config');
    else if (a === 'salvar') {
      const v = id => { const i = caixa().querySelector('[data-cs-cat="' + id + '"]'); return !!(i && i.checked); };
      Consent.salvar({ anuncios: v('anuncios'), medicao: v('medicao') });
    }
  }

  Consent.abrir = function (m) { modo = m === 'banner' ? 'banner' : 'config'; render(); };
  Consent.fechar = function () { if (!modo) return; modo = ''; render(); };
  Consent.aberto = () => !!modo;

  // Texto curto da escolha atual (aba Dados).
  Consent.resumo = function () {
    const d = Consent.ler();
    if (!d) return Consent.googleCuida() ? 'Gerenciado pela mensagem de privacidade do Google.' : 'Você ainda não escolheu.';
    const sim = Consent.CATEGORIAS.filter(c => !c.fixo && d[c.id]).map(c => c.nome.toLowerCase());
    return (sim.length ? 'Permitidos: necessários, ' + sim.join(' e ') : 'Só os necessários') + ' · escolha de ' + new Date(d.data).toLocaleDateString('pt-BR') + '.';
  };

  // Chamado ao abrir o site: aplica a escolha salva ou mostra o banner.
  Consent.iniciar = function () {
    const d = Consent.ler();
    if (d) aplicar(d);
    else if (Consent.googleCuida()) carregarAnuncios();     // Europa: a mensagem do Google pede o consentimento
    else Consent.abrir('banner');
  };

  // Para os testes.
  Consent._t = { LS, limpar: () => { carregado = false; modo = ''; try { window.localStorage.removeItem(LS); } catch (e) { /* ok */ } } };
})();
