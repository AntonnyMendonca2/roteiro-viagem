/* ==========================================================================
   captcha.js — Cloudflare Turnstile antes de gravar no servidor de links.

   Gerar link curto e criar link de edição gravam no KV do Worker; o Turnstile
   impede que um robô esgote a cota. Modo "gerenciado" com aparência
   interaction-only: na maioria das vezes não aparece nada; a caixa só surge
   quando a Cloudflare desconfia.

   O token vale uma vez só (e por 5 min): cada gravação pede um novo.
   Quem confere o token é o Worker (worker/roteiro.js) — sem isso não protege.

   Chave do site (pública): DATA.config.turnstileSiteKey. Vazia = não pede
   CAPTCHA (o Worker com TURNSTILE_SECRET recusa, e o site usa o link completo).
   ========================================================================== */
(function () {
  'use strict';

  const D = window.DATA;
  const Captcha = window.Captcha = {};
  const API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const PRAZO_MS = 60000;

  const chave = () => String((D.config && D.config.turnstileSiteKey) || '').trim();
  Captcha.ligado = () => !!chave();

  let lib = null;
  function carregar() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!lib) {
      lib = new Promise((ok, falha) => {
        const s = document.createElement('script');
        s.src = API; s.async = true;
        s.onload = () => (window.turnstile ? ok(window.turnstile) : falha(new Error('verificação anti-robô indisponível')));
        s.onerror = () => { lib = null; falha(new Error('não foi possível carregar a verificação anti-robô')); };
        document.head.appendChild(s);
      });
    }
    return lib;
  }

  // Devolve um token novo do Turnstile ('' se o site não usa CAPTCHA).
  // el: onde a caixa aparece, se a Cloudflare pedir interação.
  Captcha.token = function (el) {
    if (!chave()) return Promise.resolve('');
    if (!el) return Promise.reject(new Error('verificação anti-robô sem lugar na tela'));
    return carregar().then(ts => new Promise((ok, falha) => {
      let id = null, fim = false;
      const acabar = (erro, token) => {
        if (fim) return;
        fim = true; clearTimeout(prazo);
        try { if (id != null) ts.remove(id); } catch (e) { /* já removido */ }
        el.hidden = true;
        if (erro) falha(new Error(erro)); else ok(token);
      };
      const prazo = setTimeout(() => acabar('a verificação anti-robô demorou demais'), PRAZO_MS);
      el.hidden = false;
      try {
        id = ts.render(el, {
          sitekey: chave(),
          appearance: 'interaction-only',
          language: 'pt-br',
          callback: token => acabar('', token),
          'error-callback': () => { acabar('a verificação anti-robô falhou'); return true; },
          'timeout-callback': () => acabar('a verificação anti-robô expirou'),
          'expired-callback': () => acabar('a verificação anti-robô expirou')
        });
      } catch (e) { acabar('a verificação anti-robô falhou'); }
    }));
  };
})();
